"""Pack HTK jnas-mono-16mix-gid.hmmdefs from the Julius Dictation Kit for the browser."""

import argparse
import json
import math
from pathlib import Path
import re
import struct

DEST = Path(__file__).resolve().parents[1] / "assets/timing"


def pack(path):
    names, transitions, weights = [], [], []
    phones = re.findall(r'~h "([^"]+)"\s*<BEGINHMM>(.*?)<ENDHMM>', path.read_text(), re.S)
    for name, hmm in phones:
        names.append(name)
        matrix = list(map(float, hmm.split("<TRANSP> 5")[1].split()))
        for i in (1, 2, 3):
            transitions.append([math.log(matrix[i * 5 + i]), math.log(matrix[i * 5 + i + 1])])
        states = re.split(r"<STATE> \d+", hmm)[1:]
        if len(states) != 3:
            raise ValueError(name)
        for state in states:
            components = re.findall(
                r"<MIXTURE> \d+ (\S+)\s*<MEAN> 25\s*([^<]+)"
                r"<VARIANCE> 25\s*([^<]+)<GCONST>\s*(\S+)", state
            )
            if len(components) != 16:
                raise ValueError(name)
            for weight, mean, variance, gconst in components:
                weights.append(math.log(float(weight)) - 0.5 * float(gconst))
                weights.extend(map(float, mean.split()))
                weights.extend(0.5 / float(v) for v in variance.split())

    if len(names) != 43 or len(weights) != len(names) * 3 * 16 * 51:
        raise ValueError("Unexpected acoustic model")
    DEST.mkdir(exist_ok=True)
    (DEST / "jnas.f32").write_bytes(struct.pack(f"<{len(weights)}f", *weights))
    metadata = json.dumps({"names": names, "transitions": transitions}, separators=(",", ":"))
    (DEST / "model.json").write_text(metadata + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("hmmdefs", type=Path)
    pack(parser.parse_args().hmmdefs)
