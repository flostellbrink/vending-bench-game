import ast
import inspect
import json
from vending.engine import Engine
from vending import config


class OperatorEngine(Engine):
    def _finish(self, tool, body):
        self.reply_body = body
        return super()._finish(tool, body)

    def spend_time(self, tool):
        self.notices = super().spend_time(tool)
        return self.notices

    def wait_for_next_day(self):
        self.notices = super().wait_for_next_day()
        return self.notices


def start(seed):
    global engine, available
    engine = OperatorEngine.new(seed)
    available = describe_actions()


def describe_actions():
    tools = {}
    for name, method in inspect.getmembers(engine, inspect.ismethod):
        if name.startswith("tool_"):
            tools[name[5:]] = [
                [p.name, str(p.annotation), p.default is inspect.Parameter.empty]
                for p in inspect.signature(method).parameters.values()
            ]
    return tools


def actions():
    return json.dumps(available)


def act(name, arguments):
    if engine.over or name not in available:
        raise ValueError("Action unavailable")
    engine.reply_body = ""
    engine.notices = []
    return getattr(engine, "tool_" + name)(**json.loads(arguments))


def receipt():
    body = engine.reply_body
    factors = None
    marker = "\nYesterday's demand multipliers — "
    if marker in body:
        main, breakdown = body.rsplit(marker, 1)
        terms, separator, machines = breakdown.partition(", machines: ")
        if separator:
            try:
                values = dict(term.split(": ", 1) for term in terms.split(", "))
                values["machines"] = ast.literal_eval(machines)
            except (SyntaxError, ValueError):
                pass
            else:
                factors, body = values, main
    return json.dumps({"body": body, "notices": engine.notices, "demand": factors})


def snapshot():
    s = engine.s
    return json.dumps(dict(day=s["day"], minute=s["minute"], cash=s["balance"],
                           over=engine.over, failed=s["terminated"],
                           startDate=s["start_date"], slots=config.all_slots(),
                           sites=[{"id": key, "name": location["name"]}
                                  for key, location in config.LOCATIONS.items()],
                           machines=config.machine_ids(), weather=s["weather"],
                           costs=config.TOOL_MINUTES, defaultCost=config.DEFAULT_TOOL_MINUTES,
                           opens=config.DAY_START_MINUTE, closes=config.DAY_END_MINUTE, fee=config.DAILY_SPOT_FEE, days=config.SIM_DAYS,
                           final=engine.score() if engine.over else None))


def progress():
    s = engine.s
    return json.dumps(dict(day=s["day"], minute=s["minute"], cash=s["balance"], over=engine.over))
