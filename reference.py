"""Read the selected Git snapshot inside the same Python runtime used for play."""

import ast
import hashlib
import json
import re
import sys
import tomllib
from pathlib import Path
from zipfile import ZipFile

ROOT = Path("/upstream")
TASK = ROOT / "tasks/vending-bench"
SERVER = TASK / "environment/sim-server"
BASELINES = ROOT / "results/baselines"
sys.path.insert(0, str(ROOT / "scripts"))

from local_run import Bot, DirectClient, Engine, build_world
from sync_config import render
from vending import config


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def tool_descriptions():
    descriptions = {}
    for node in ast.parse((SERVER / "server.py").read_text()).body:
        if not isinstance(node, ast.FunctionDef):
            continue
        for decorator in node.decorator_list:
            if not isinstance(decorator, ast.Call) or ast.unparse(decorator.func) != "mcp.tool":
                continue
            description = ast.get_docstring(node)
            for keyword in decorator.keywords:
                if keyword.arg == "description":
                    expression = compile(ast.Expression(keyword.value), "server.py", "eval")
                    description = eval(expression, {"__builtins__": {}, "config": config})
            if not description or not hasattr(Engine, "tool_" + node.name):
                raise ValueError(f"Missing engine method or description: {node.name}")
            descriptions[node.name] = " ".join(description.split())
    if not descriptions:
        raise ValueError("No published MCP business tools in server.py")
    return descriptions


def reference_trace(version):
    engine = Engine.new(config.SEED)
    balances = [engine.s["balance"]]

    class Recorder(DirectClient):
        def call(self, tool, **kwargs):
            day = engine.s["day"]
            result = super().call(tool, **kwargs)
            if len(balances) == day and (day != engine.s["day"] or engine.over):
                balances.append(engine.s["balance"])
            return result

    Bot(Recorder(engine), build_world()).run(max_days=config.SIM_DAYS)
    result = engine.score()
    if result["version"] != version or not engine.over:
        raise ValueError("Scripted operator and pinned task disagree or the run did not finish")
    calibrated = BASELINES / "scripted-reference/results.json"
    published = [
        row for row in (read_json(calibrated) if calibrated.is_file() else [])
        if (row["version"], row["seed"], row["sim_days"])
        == (version, config.SEED, config.SIM_DAYS)
    ]
    if len(published) > 1:
        raise ValueError("Ambiguous published scripted calibration")
    if result["completed"] and len(balances) != config.SIM_DAYS + 1:
        raise ValueError("Missing daily balance in scripted replay")
    if balances[-1] != result["final_balance"]:
        raise ValueError("Closing balance does not match the scripted result")
    reproduced = bool(published) and all(result[k] == published[0][k] for k in
                        ("reward", "final_balance", "completed", "starting_balance",
                         "currency", "tool_calls", "units_sold"))
    # A configuration update may precede a published recalibration. In that case the
    # reproducible local bot is still valid; the old published target is not.
    source = calibrated if reproduced else TASK / "solution/reference_bot.py"
    return {"kind": "script", "score": result["reward"], "values": balances,
            "endDay": result["days_operated"], "finalBalance": result["final_balance"],
            "sourcePath": source.relative_to(ROOT).as_posix()}


def archived_scores(path):
    text = re.sub(r"^>\s?", "", path.read_text(), flags=re.MULTILINE)
    version = re.search(r"under the v([\d.]+)\s+rules", text)
    conditions = re.search(r"(\d+) simulated days, simulation seed (\d+)", text)
    count = re.search(r"\*\*(\d+) models\b", text)
    if not (version and conditions and count):
        raise ValueError(f"Unrecognised model publication: {path.relative_to(ROOT)}")
    rows = []
    for line in text.splitlines():
        fields = [field.strip() for field in line.strip("|").split("|")]
        if len(fields) < 5 or fields[2] not in ("True", "False"):
            continue
        rows.append([fields[1], float(fields[4].removeprefix("€").replace(",", ""))])
    if len(rows) != int(count[1]):
        raise ValueError("Model summary count does not match its published rows")
    return {"version": version[1], "days": int(conditions[1]), "seed": int(conditions[2]),
            "scores": rows, "sourcePath": path.relative_to(ROOT).as_posix()}


def check_batch_source(batch, manifest):
    # Upstream hashes the member name and uncompressed contents, not the ZIP container.
    digest = hashlib.sha256()
    with ZipFile(batch / "evaluation-source.zip") as archive:
        for name in archive.namelist():
            data = archive.read(name)
            digest.update(name.encode())
            digest.update(data)
        root = SERVER.relative_to(ROOT).as_posix() + "/"
        recorded = {name for name in archive.namelist() if name.startswith(root)}
        actual = {path.relative_to(ROOT).as_posix() for path in SERVER.rglob("*")
                  if path.suffix in (".py", ".toml")}
        matching_engine = recorded == actual and all(
            archive.read(name) == (ROOT / name).read_bytes() for name in recorded)
    declared = (batch / "evaluation-source.sha256").read_text().strip()
    if digest.hexdigest() != declared or declared != manifest["source_sha256"]:
        raise ValueError("Model batch and evaluation source fingerprints disagree")
    return matching_engine


def comparable_config(recorded):
    expected = config.CONFIG
    # Each upstream trial writes state to its own file and explicitly disables resume.
    def gameplay(settings):
        runtime = {k: v for k, v in settings["runtime"].items() if k not in ("state_path", "resume")}
        return {**settings, "runtime": runtime}
    return gameplay(expected) == gameplay(recorded)


def recorded_balances(path, result):
    if not path.exists():
        return None
    balances = [config.STARTING_BALANCE]
    clock = f"{config.DAY_START_MINUTE // 60:02d}:{config.DAY_START_MINUTE % 60:02d}"
    footer = re.compile(
        rf"\[Day (\d+)/{config.SIM_DAYS} — [^\n]* {clock} — balance "
        rf"{re.escape(config.CURRENCY_SYMBOL)}(-?[\d,]+\.\d{{2}})\]\s*$")
    with path.open() as exchanges:
        for line in exchanges:
            for message in json.loads(line):
                if message.get("role") != "tool":
                    continue
                match = footer.search(message["content"])
                if match and int(match[1]) == len(balances) + 1:
                    balances.append(float(match[2].replace(",", "")))
    if result["completed"] and len(balances) == config.SIM_DAYS:
        balances.append(result["final_balance"])
    return balances if len(balances) > 1 else None


def model_results(version):
    models, archives = [], []
    for batch in sorted(BASELINES.glob("models-*")):
        if not (batch / "aggregate.json").exists():
            archives.append(archived_scores(batch / "README.md"))
            continue
        summary = read_json(batch / "aggregate.json")
        manifest = read_json(batch / "manifest.json")
        same_engine = check_batch_source(batch, manifest)
        for row in summary["leaderboard"]:
            result_path = (batch / row["result_path"]).resolve()
            if not result_path.is_relative_to(batch):
                raise ValueError("Model result path escapes its batch")
            result = read_json(result_path)
            for field in ("seed", "horizon_days", "model_requested", "reward", "completed"):
                if row[field] != result[field]:
                    raise ValueError(f"Model summary and result disagree on {field}")
            if result["benchmark_sha256"] != manifest["source_sha256"]:
                raise ValueError("Model trial and batch fingerprints disagree")
            name = row["display_name"]
            days, seed = result["horizon_days"], result["seed"]
            source = result_path.relative_to(ROOT).as_posix()
            comparable = (same_engine and result["version"] == version
                          and days == config.SIM_DAYS and seed == config.SEED
                          and comparable_config(read_json(result_path.parent / "config.json")))
            if comparable:
                models.append({"kind": "model", "name": name, "score": result["reward"],
                               "endDay": days if result["completed"] else result.get("days_operated"),
                               "finalBalance": result["final_balance"],
                               "sourcePath": source,
                               "values": recorded_balances(result_path.parent / "conversation.jsonl", result)})
            else:
                archive = next((a for a in archives if (a["version"], a["days"], a["seed"])
                                == (result["version"], days, seed)), None)
                if archive is None:
                    archive = {"version": result["version"], "days": days, "seed": seed,
                               "scores": [], "sourcePath": (batch / "aggregate.json").relative_to(ROOT).as_posix()}
                    archives.append(archive)
                archive["scores"].append([name, result["reward"]])
    return models, archives


def metadata():
    task = tomllib.loads((TASK / "task.toml").read_text())
    version = task["task"]["version"]
    brief = render()
    models, archives = model_results(version)
    return json.dumps({"version": version, "seed": config.SEED, "days": config.SIM_DAYS,
                       "startingBalance": config.STARTING_BALANCE, "currency": config.CURRENCY,
                       "network": {"sites":len(config.LOCATIONS),"machines":len(config.machine_ids()),
                                   "fee":config.DAILY_SPOT_FEE, "opens":config.DAY_START_MINUTE,
                                   "closes":config.DAY_END_MINUTE, "refill":config.TOOL_MINUTES.get("restock_machine",config.DEFAULT_TOOL_MINUTES)},
                       "brief": brief.strip(), "tools": tool_descriptions(), "archives": archives,
                       "rivals": [reference_trace(version), *models]}, allow_nan=False)
