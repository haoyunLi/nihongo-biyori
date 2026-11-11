"""Rebuild the static Japanese MP3 clips from the course, using Node and Python.

Python packages: pyopenjtalk-plus==0.4.1.post10, numpy and lameenc.
Run from any directory: python scripts/generate_audio.py
"""

import hashlib
import json
import re
import subprocess
import unicodedata
from pathlib import Path

import lameenc
import numpy as np
import pyopenjtalk


ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets/audio"
HOME_PHRASES = ("すみません、駅はどこですか。", "こんにちは。")
SINGLES = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ"
GLIDES = [lead + tail for lead in "きぎしじちぢにひびぴみり" for tail in "ゃゅょ"]
# Early lessons display only kana. Supply the intended word to the speech
# dictionary so that homophones such as 花 / 鼻 and 柿 / 牡蠣 keep their accents.
WORD_SPELLINGS = {
    "あお": "青", "いえ": "家", "かき": "柿", "すし": "寿司", "すき": "好き",
    "いか": "烏賊", "ちか": "地下", "つき": "月", "ねこ": "猫", "なつ": "夏",
    "ふね": "船", "はな": "花", "うみ": "海", "みみ": "耳", "やま": "山",
    "ゆき": "雪", "そら": "空", "いろ": "色", "わたし": "私", "ほんや": "本屋",
    "ほん": "本", "かぎ": "鍵", "みず": "水", "かぜ": "風", "ぱん": "パン",
    "ぶた": "豚", "きゃく": "客", "きょう": "今日", "きて": "来て", "きって": "切手",
    "これ、かき": "これ、柿", "きって、ありますか": "切手、ありますか",
    "京都行きは何番線ですか": "京都ゆきは何番線ですか",
}


def key(text):
    return re.sub(r"\s", "", unicodedata.normalize("NFKC", text))


def katakana(text):
    return "".join(chr(ord(c) + 96) if "ぁ" <= c <= "ゖ" else c for c in text)


def kana_clips():
    result = {}
    for kana in [*SINGLES, *GLIDES]:
        # Standalone ハ and ヘ must retain their consonants in the kana chart.
        sound = katakana(kana)
        result[kana] = result[sound] = sound
    return result


def lexical_input(text):
    word = text.rstrip("。！？?!")
    suffix = text[len(word):]
    return WORD_SPELLINGS.get(word, word) + suffix


def collect():
    command = [
        "node", "--no-warnings", "--experimental-default-type=module",
        "--input-type=module", "-e",
        "import {lessons} from './lessons.js'; console.log(JSON.stringify(lessons))",
    ]
    lessons = json.loads(subprocess.check_output(command, cwd=ROOT))
    phrases = kana_clips()
    phrases.update({phrase: phrase for phrase in HOME_PHRASES})
    for lesson in lessons:
        examples = [ex for step in lesson["steps"] for ex in step["examples"]]
        for ex in [*examples, *lesson["dialogue"]]:
            text = ex["jp"]
            phrases.setdefault(key(text), lexical_input(text))
        for quiz in lesson["quiz"]:
            if quiz.get("listen"):
                text = quiz["listen"]
                phrases.setdefault(key(text), lexical_input(text))
    return phrases


def write_mp3(spoken, path):
    waveform, rate = pyopenjtalk.tts(spoken, speed=0.96, predict_nani=False)
    peak = np.abs(waveform).max()
    if peak < 32:
        raise ValueError(f"No audible speech in {spoken!r}")
    voiced = np.flatnonzero(np.abs(waveform) > max(24, peak * 0.002))
    start = max(0, voiced[0] - int(rate * 0.055))
    end = min(len(waveform), voiced[-1] + int(rate * 0.095))
    pcm = np.rint(waveform[start:end] * (26500 / peak)).astype("<i2")
    encoder = lameenc.Encoder()
    encoder.set_channels(1)
    encoder.set_in_sample_rate(rate)
    encoder.set_bit_rate(80)
    encoder.set_quality(2)
    path.write_bytes(encoder.encode(pcm.tobytes()) + encoder.flush())


def build(phrases):
    DEST.mkdir(parents=True, exist_ok=True)
    manifest = DEST / "catalog.js"
    previous = set()
    if manifest.exists():
        old = manifest.read_text(encoding="utf-8").removeprefix("export const clips = ").rstrip(";\n")
        previous = set(json.loads(old).values())
    catalog = {}
    generated = set()
    for text, spoken in sorted(phrases.items()):
        stem = hashlib.sha256(spoken.encode()).hexdigest()[:16]
        if stem not in generated:
            write_mp3(spoken, DEST / f"{stem}.mp3")
            generated.add(stem)
        catalog[text] = stem
    entries = json.dumps(catalog, ensure_ascii=False, indent=2)
    pending = manifest.with_suffix(".tmp")
    pending.write_text(f"export const clips = {entries};\n", encoding="utf-8")
    pending.replace(manifest)
    for unused in previous - generated:
        if re.fullmatch("[0-9a-f]{16}", unused):
            (DEST / f"{unused}.mp3").unlink(missing_ok=True)
    print(f"{len(catalog)} written forms, {len(generated)} sound clips")


if __name__ == "__main__":
    build(collect())
