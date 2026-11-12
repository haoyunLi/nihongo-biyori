"""Build Japanese teaching clips locally.

Requires voicevox_core 0.17.1, its CPU ONNX runtime, VOICEVOX Nemo n0.vvm,
an Open JTalk UTF-8 dictionary, numpy, soundfile and lameenc. Pass local paths
with --runtime, --model, --dictionary and --recordings. The filenames for
the recordings are listed in kana-recordings.json and word-recordings.json.
Extract the two upstream repositories under the recordings directory as
explained in assets/audio/CREDITS.md.
"""
import argparse
import hashlib
import io
import json
import re
import subprocess
import unicodedata
import wave
from pathlib import Path

import lameenc
import numpy as np
import soundfile as sf
from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile

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
    js = """import {lessons} from './lessons.js';
    import {kanaGuides} from './kana-guides.js';
    console.log(JSON.stringify({lessons, words:kanaGuides.flatMap(g=>g.words)}))"""
    command = ["node", "--no-warnings", "--experimental-default-type=module",
               "--input-type=module", "-e", js]
    course = json.loads(subprocess.check_output(command, cwd=ROOT))
    phrases = kana_clips()
    phrases.update({s: s for s in HOME_PHRASES})
    replies = {}
    for lesson in course["lessons"]:
        for ex in [ex for part in lesson["steps"] for ex in part["examples"]] + lesson["dialogue"]:
            text = ex["jp"]
            phrases.setdefault(key(text), lexical_input(text))
            if ex.get("who", "").startswith("你"):
                replies[key(text)] = lexical_input(text)
        for quiz in lesson["quiz"]:
            if "listen" in quiz:
                text = quiz["listen"]
                phrases.setdefault(key(text), lexical_input(text))
    for ex in course["words"]:
        phrases.setdefault(key(ex["jp"]), lexical_input(ex["jp"]))
    return phrases, replies


def encode(samples, rate, target):
    peak = np.abs(samples).max()
    if peak < 0.0005:
        raise ValueError(f"Silent clip: {target.name}")
    # Retain relative dynamics and leave headroom for MP3 decoding.
    rms = np.sqrt(np.mean(samples[samples**2 > (peak * 0.03)**2]**2))
    gain = min(0.81 / peak, 0.15 / max(rms, 0.001))
    pcm = np.rint(samples * gain * 32767).astype("<i2")
    encoder = lameenc.Encoder()
    encoder.set_channels(1)
    encoder.set_in_sample_rate(rate)
    encoder.set_bit_rate(96)
    encoder.set_quality(2)
    target.write_bytes(encoder.encode(pcm.tobytes()) + encoder.flush())


def human_take(path):
    samples, rate = sf.read(path)
    if samples.ndim == 2:
        samples = samples.mean(axis=1)
    # Preserve the full utterance, including weak fricatives and natural
    # pauses. Only remove silence beyond both margins at the outer edges.
    block = rate // 100
    frames = samples[:len(samples)//block*block].reshape(-1, block)
    rms = np.sqrt((frames**2).mean(axis=1))
    active = np.flatnonzero(rms > max(0.001, rms.max()*0.018))
    if not active.size:
        raise ValueError(f"Silent recording: {path}")
    lo = max(0, (active[0]-10)*block)
    hi = min(len(samples), (active[-1]+15)*block)
    return samples[lo:hi], rate


def neural_take(synth, spoken, style, isolated):
    # These written forms are unambiguous in their teaching context.
    spoken = {"ひょう":"雹"}.get(spoken,spoken)
    query = synth.create_audio_query(spoken, style)
    query.speed_scale = 0.96
    query.pre_phoneme_length = 0.07
    query.post_phoneme_length = 0.12
    if isolated:
        for phrase in query.accent_phrases:
            for mora in phrase.moras:
                mora.vowel_length = max(mora.vowel_length, 0.19)
    audio = synth.synthesis(query, style, enable_interrogative_upspeak=True)
    with wave.open(io.BytesIO(audio)) as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(float)/32768, w.getframerate()


def build_contrasts(synth):
    js = """import {contrasts} from './contrast-data.js';
    console.log(JSON.stringify(contrasts.flatMap(p=>p.items).filter(w=>w.spoken)))"""
    command = ["node", "--no-warnings", "--experimental-default-type=module",
               "--input-type=module", "-e", js]
    catalog = {}
    for item in json.loads(subprocess.check_output(command, cwd=ROOT)):
        # Even a word with an existing human recording needs the paired voice
        # here so the listener cannot identify its meaning by the speaker.
        stem = hashlib.sha256(("contrast:" + item["spoken"]).encode()).hexdigest()[:16]
        samples, rate = neural_take(synth, item["spoken"], 10005, False)
        encode(samples, rate, DEST / (stem + ".mp3"))
        catalog[item["audio"]] = stem
    manifest = "export const contrastClips = " + json.dumps(catalog, ensure_ascii=False, indent=2) + ";\n"
    (DEST / "contrasts.js").write_text(manifest, encoding="utf-8")


def activity_inputs():
    js = """import {activitySpeech} from './activity-data.js';
    import {clips,replyClips} from './assets/audio/catalog.js';
    import {contrastClips} from './assets/audio/contrasts.js';
    const key=s=>s.normalize("NFKC").split(/\\s+/u).join("");
    console.log(JSON.stringify(activitySpeech.filter(x=>x.learner
      ? !replyClips[key(x.jp)] : !(clips[key(x.jp)] || contrastClips[key(x.jp)]))));"""
    return json.loads(subprocess.check_output(
        ["node", "--experimental-default-type=module", "-e", js], cwd=ROOT))


def build_activities(synth):
    manifests = {"activityClips": {}, "activityReplies": {}}
    for item in activity_inputs():
        style = 10001 if item.get("learner") else 10005
        spoken = item.get("spoken", item["jp"])
        stem = hashlib.sha256(f"activity:{style}:{spoken}".encode()).hexdigest()[:16]
        samples,rate = neural_take(synth,spoken,style,False)
        encode(samples,rate,DEST/(stem+".mp3"))
        manifests["activityReplies" if item.get("learner") else "activityClips"][key(item["jp"])] = stem
    (DEST/"activities.js").write_text("\n".join(
        "export const "+name+" = "+json.dumps(table,ensure_ascii=False,indent=2)+";"
        for name,table in manifests.items())+"\n")


def build(args):
    synth = Synthesizer(Onnxruntime.load_once(filename=str(args.runtime)),
                        OpenJtalk(str(args.dictionary)), cpu_num_threads=3)
    with VoiceModelFile.open(str(args.model)) as model:
        synth.load_voice_model(model)
    if args.activities_only:
        build_activities(synth)
        return
    build_contrasts(synth)
    if args.contrasts_only:
        return
    source = json.loads((ROOT/"scripts/kana-recordings.json").read_text())
    kana_sources = {katakana(h):args.recordings/relative for h,relative in source.items()}
    word_files = json.loads((ROOT/"scripts/word-recordings.json").read_text())
    word_sources = {word:args.recordings/relative for word,relative in word_files.items()}
    for path in [*kana_sources.values(), *word_sources.values()]:
        if not path.is_file():
            raise FileNotFoundError(f"Missing attributed recording: {path}")
    phrases, replies = collect()
    symbols = set(kana_clips().values())
    parts = []
    generated = set()
    used_human = set()
    for name, inputs, style in [("clips",phrases,10005),("replyClips",replies,10001)]:
        catalog = {}
        for text, spoken in sorted(inputs.items()):
            # Keep existing default filenames usable by tabs opened before an update.
            identity = spoken if name=="clips" else f"{style}:{spoken}"
            stem = hashlib.sha256(identity.encode()).hexdigest()[:16]
            path = DEST/f"{stem}.mp3"
            native_file = None
            if name == "clips":
                native_file = kana_sources.get(spoken) or word_sources.get(spoken.rstrip("。"))

            if stem not in generated:
                samples,rate = human_take(native_file) if native_file else neural_take(synth,spoken,style,spoken in symbols)
                encode(samples,rate,path)
                generated.add(stem)
            if name=="clips" and spoken in kana_sources:
                used_human.add(spoken)
            catalog[text] = stem
        parts.append("export const "+name+" = "+json.dumps(catalog,ensure_ascii=False,indent=2)+";")
    parts.append("export const humanKana = "+json.dumps(sorted(used_human),ensure_ascii=False)+";")
    parts.append("export const humanWords = "+json.dumps(sorted(word_sources),ensure_ascii=False)+";")
    pending = DEST/"catalog.tmp"
    pending.write_text("\n".join(parts)+"\n")
    pending.replace(DEST/"catalog.js")
    build_activities(synth)
    print(f"{len(generated)} MP3s, {len(used_human)} human kana, {len(replies)} learner replies")


if __name__ == "__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--activities-only",action="store_true")
    parser.add_argument("--contrasts-only", action="store_true")
    parser.add_argument("--recordings", type=Path)
    for flag in ["runtime","dictionary","model"]:
        parser.add_argument("--"+flag,type=Path,required=True)
    args = parser.parse_args()
    if not (args.contrasts_only or args.activities_only) and args.recordings is None:
        parser.error("--recordings is required for a full rebuild")
    build(args)
