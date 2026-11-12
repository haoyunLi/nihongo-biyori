"""Build phoneme sequences for each published example using its VOICEVOX reading."""

import argparse
import hashlib
import json
import subprocess

from generate_audio import ROOT, collect, activity_inputs
from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile


def make_plan(synth, spoken, style):
    # The same lexical override as the shipped audio for the isolated word 雹.
    query = synth.create_audio_query({"ひょう": "雹"}.get(spoken, spoken), style)
    plan = []
    for phrase in query.accent_phrases:
        for mora in phrase.moras:
            consonant = mora.consonant or ""
            aliases = {"v": "b", "ty": "ch", "kw": "k", "gw": "g", "zy": "j"}
            consonant = aliases.get(consonant, consonant)
            vowel = {"cl": "q", "N": "N"}.get(mora.vowel, mora.vowel.lower())
            plan.append([mora.text, " ".join(filter(None, (consonant, vowel)))])
        if phrase.pause_mora:
            plan.append(["、", "sp"])
    return plan


def main(args):
    runtime = Onnxruntime.load_once(filename=args.runtime)
    synth = Synthesizer(runtime, OpenJtalk(args.dictionary), cpu_num_threads=2)
    with VoiceModelFile.open(args.model) as model:
        synth.load_voice_model(model)
    items = {}
    phrases, replies = collect()
    for lines, style, prefix in [(phrases, 10005, ""), (replies, 10001, "10001:")]:
        for spoken in lines.values():
            items[prefix + spoken] = (spoken, style)

    js = ("import {contrasts} from './contrast-data.js';"
          "console.log(JSON.stringify(contrasts.flatMap(p=>p.items).filter(s=>s.spoken)))")
    contrast_words = subprocess.check_output(
        ["node", "--experimental-default-type=module", "-e", js], cwd=ROOT
    )
    for entry in json.loads(contrast_words):
        spoken = entry["spoken"]
        items["contrast:" + spoken] = (spoken, 10005)

    for item in activity_inputs():
        style = 10001 if item.get("learner") else 10005
        spoken = item.get("spoken", item["jp"])
        items[f"activity:{style}:{spoken}"] = (spoken, style)

    directory = ROOT / "assets/timing"
    allowed = set(json.loads((directory / "model.json").read_text())["names"])
    plans = {}
    for identity, (spoken, style) in sorted(items.items()):
        stem = hashlib.sha256(identity.encode()).hexdigest()[:16]
        plan = make_plan(synth, spoken, style)
        for _, phones in plan:
            if not set(phones.split()) <= allowed:
                raise ValueError((identity, phones))
        plans[stem] = plan

    if set(plans) != {p.stem for p in (ROOT / "assets/audio").glob("*.mp3")}:
        raise ValueError("Plans and published audio files differ")
    payload = json.dumps(plans, ensure_ascii=False, separators=(",", ":"))
    (directory / "plans.json").write_text(payload + "\n")
    print(f"{len(plans)} reference pronunciations")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for key in ["runtime", "dictionary", "model"]:
        parser.add_argument("--" + key, required=True)
    main(parser.parse_args())
