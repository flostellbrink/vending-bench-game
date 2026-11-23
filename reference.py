import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(sys.argv[1]) / "scripts"))
from local_run import Bot, DirectClient, Engine, build_world

engine = Engine.new(1)
balances = [engine.s["balance"]]


class Recorder(DirectClient):
    def call(self, tool, **kwargs):
        day = engine.s["day"]
        result = super().call(tool, **kwargs)
        if day != engine.s["day"] or engine.over and len(balances) == day:
            balances.append(engine.s["balance"])
        return result


Bot(Recorder(engine), build_world()).run(max_days=30)
print(json.dumps(balances))
