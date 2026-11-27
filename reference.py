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


def published_value(expression):
    return eval(compile(ast.Expression(expression), "server.py", "eval"),
                {"__builtins__": {}, "config": config})


def published_tools():
    for node in ast.parse((SERVER / "server.py").read_text()).body:
        if not isinstance(node, ast.FunctionDef):
            continue
        for decorator in node.decorator_list:
            if not isinstance(decorator, ast.Call) or ast.unparse(decorator.func) != "mcp.tool":
                continue
            yield node, decorator
            break


def tool_metadata():
    descriptions = {}
    defaults = {}
    for node, decorator in published_tools():
        description = ast.get_docstring(node)
        for keyword in decorator.keywords:
            if keyword.arg == "description":
                description = published_value(keyword.value)
        if not description or not hasattr(Engine, "tool_" + node.name):
            raise ValueError(f"Missing engine method or description: {node.name}")
        descriptions[node.name] = description.strip()
        params = node.args
        positional = [*params.posonlyargs, *params.args]
        optional = zip(reversed(positional), reversed(params.defaults))
        defaults[node.name] = {arg.arg: published_value(value) for arg, value in optional}
        defaults[node.name].update({
            arg.arg: published_value(value)
            for arg, value in zip(params.kwonlyargs, params.kw_defaults) if value is not None
        })
    if not descriptions:
        raise ValueError("No published MCP business tools in server.py")
    return descriptions, defaults


def browser_tools():
    functions = []
    for node, _ in published_tools():
        node.decorator_list = []
        functions.append(node)
    names = ", ".join(f"{node.name!r}: {node.name}" for node in functions)
    return "\n\n".join([*(ast.unparse(node) for node in functions), f"tools = {{{names}}}"])


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


def recorded_calls(path):
    calls, replies = [], {}
    with path.open() as exchanges:
        for line in exchanges:
            for message in json.loads(line):
                if message.get("role") == "assistant":
                    calls += [(call["id"], call["function"]["name"], call["function"]["arguments"])
                              for call in message.get("tool_calls") or []]
                elif message.get("role") == "tool":
                    replies[message["tool_call_id"]] = message["content"]
    return calls, replies


def model_replay(rival):
    """Rebuild a trial's moves, or None unless every reply and the score reproduce."""
    result_path = ROOT / rival["sourcePath"]
    conversation = result_path.parent / "conversation.jsonl"
    if not conversation.exists():
        return None
    calls, replies = recorded_calls(conversation)
    scope = {"config": config}
    exec(browser_tools(), scope)
    engine = scope["ENGINE"] = Engine.new(config.SEED)
    moves = []
    checkpoints = [{"day": engine.s["day"], "moveCount": 0, "cash": engine.s["balance"]}]
    for call_id, tool, arguments in calls:
        if engine.over:
            break
        day = engine.s["day"]
        try:
            args = json.loads(arguments)
            reply = scope["tools"][tool](**args)
        except Exception:
            return None
        if reply != replies.get(call_id):
            return None
        moves.append([tool, args])
        if day != engine.s["day"] and not engine.over:
            checkpoints.append({"day": engine.s["day"], "moveCount": len(moves),
                                "cash": engine.s["balance"]})
    score, result = engine.score(), read_json(result_path)
    if not engine.over or any(score[k] != result[k] for k in
                              ("reward", "final_balance", "completed", "tool_calls", "units_sold")):
        return None
    return {"seed": config.SEED, "moves": moves, "checkpoints": checkpoints}


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


def trial_key(result):
    return result["model_requested"], result["timestamp_utc"]


def model_results(version):
    models = []
    for aggregate in sorted(BASELINES.glob("models-*/aggregate.json")):
        batch = aggregate.parent
        summary = read_json(aggregate)
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
                models.append({"trial": trial_key(result),
                               "kind": "model", "name": name, "score": result["reward"],
                               "endDay": days if result["completed"] else result.get("days_operated"),
                               "finalBalance": result["final_balance"],
                               "sourcePath": source,
                               "values": recorded_balances(result_path.parent / "conversation.jsonl", result)})
    return models


def evaluation_fingerprint(root):
    engine = root / SERVER.relative_to(ROOT)
    paths = sorted([*engine.rglob("*.py"), *engine.rglob("*.toml"),
                    *root.glob("scripts/*.py"), *root.glob("tests/*.py"),
                    *root.glob("tasks/vending-bench/instruction*.md")])
    digest = hashlib.sha256()
    for path in paths:
        digest.update(path.relative_to(root).as_posix().encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()


def study_batches():
    for manifest_path in sorted(ROOT.glob("results/*/single-agent/*/manifest.json")):
        batch = manifest_path.parent
        manifest = read_json(manifest_path)
        if manifest["days"] != config.SIM_DAYS or config.SEED not in manifest["seeds"]:
            continue
        declared = (batch / "evaluation-source.sha256").read_text().strip()
        if declared != manifest["source_sha256"]:
            raise ValueError("Study batch and evaluation source fingerprints disagree")
        yield batch, manifest


def study_fingerprints():
    return sorted({manifest["source_sha256"] for _, manifest in study_batches()})


def study_results(version):
    verified = set(json.loads(globals().get("verified_study_sources", "[]")))
    latest = {}
    for batch, manifest in study_batches():
        if manifest["source_sha256"] not in verified:
            continue
        names = read_json(batch / "models.json")
        for result_path in sorted(batch.glob("*/result.json")):
            result = read_json(result_path)
            if result["benchmark_sha256"] != manifest["source_sha256"]:
                raise ValueError("Study trial and batch fingerprints disagree")
            if (result["version"], result["horizon_days"], result["seed"]) != (
                    version, config.SIM_DAYS, config.SEED):
                continue
            model = result["model_requested"]
            if model in latest and latest[model][0]["timestamp_utc"] >= result["timestamp_utc"]:
                continue
            latest[model] = (result, result_path, names[model]["name"].split(": ", 1)[-1])
    return [{"trial": trial_key(result), "kind": "model", "name": name, "score": result["reward"],
             "endDay": result["days_operated"], "finalBalance": result["final_balance"],
             "sourcePath": path.relative_to(ROOT).as_posix(),
             "values": recorded_balances(path.parent / "conversation.jsonl", result)}
            for result, path, name in latest.values()]


def metadata():
    task = tomllib.loads((TASK / "task.toml").read_text())
    version = task["task"]["version"]
    brief = render()
    script = reference_trace(version)
    tools, defaults = tool_metadata()
    # Baselines reuse study trials; the first copy wins because baselines record daily balances.
    models, trials = [], set()
    for rival in [*model_results(version), *study_results(version)]:
        trial = rival.pop("trial")
        if trial not in trials:
            trials.add(trial)
            models.append(rival)
    for rival in sorted(models, key=lambda rival: -rival["score"]):
        replay = model_replay(rival)
        if replay:
            rival["replay"] = replay
            break
    return json.dumps({"version": version, "seed": config.SEED, "days": config.SIM_DAYS,
                       "startingBalance": config.STARTING_BALANCE, "currency": config.CURRENCY,
                       "network": {"sites":len(config.LOCATIONS),"machines":len(config.machine_ids()),
                                   "slots": config.all_slots(),
                                   "fee":config.DAILY_SPOT_FEE, "opens":config.DAY_START_MINUTE,
                                   "closes":config.DAY_END_MINUTE, "refill":config.TOOL_MINUTES.get("restock_machine",config.DEFAULT_TOOL_MINUTES)},
                       "brief": brief.strip(), "tools": tools, "toolDefaults": defaults,
                       "reportLimits": {"mailCount": config.EMAIL_LIST_LIMIT_MAX,
                                        "salesDays": config.SALES_REPORT_MAX_DAYS},
                       "rivals": [script, *models]},
                      allow_nan=False)
