import inspect
import json
from vending.engine import Engine
from vending import config


def start(seed):
    global engine
    engine = Engine.new(seed)


def actions():
    tools = {}
    for name, method in inspect.getmembers(engine, inspect.ismethod):
        if name.startswith("tool_"):
            tools[name[5:]] = [
                [p.name, str(p.annotation), p.default is inspect.Parameter.empty]
                for p in inspect.signature(method).parameters.values()
            ]
    return json.dumps(tools)


def act(name, arguments):
    if engine.over or name not in json.loads(actions()):
        raise ValueError("Action unavailable")
    return getattr(engine, "tool_" + name)(**json.loads(arguments))


def snapshot():
    s = engine.s
    return json.dumps(dict(day=s["day"], minute=s["minute"], cash=s["balance"],
                           over=engine.over, failed=s["terminated"],
                           startDate=s["start_date"], slots=config.all_slots(),
                           machines=config.machine_ids(), weather=s["weather"],
                           costs=config.TOOL_MINUTES, defaultCost=config.DEFAULT_TOOL_MINUTES,
                           opens=config.DAY_START_MINUTE, closes=config.DAY_END_MINUTE))
