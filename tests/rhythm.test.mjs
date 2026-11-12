import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { clipStem } from "../clip-source.js";
import { features } from "../rhythm-features.js";
import { makeGroups, measure, compareAlignment } from "../rhythm-align.js";

const asset = (name) =>
  readFileSync(new URL("../assets/timing/" + name, import.meta.url));
const model = JSON.parse(asset("model.json"));
const packed = asset("jnas.f32");
model.weights = new Float32Array(
  packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength),
);
const plans = JSON.parse(asset("plans.json"));

test("every shipped MP3 has a usable acoustic pronunciation plan", () => {
  const files = readdirSync(new URL("../assets/audio/", import.meta.url))
    .filter((x) => x.endsWith(".mp3"))
    .map((x) => x.slice(0, -4));
  assert.deepEqual(Object.keys(plans).sort(), files.sort());
  for (const plan of Object.values(plans)) {
    for (const unit of makeGroups(plan))
      for (const phone of unit.phones)
        assert.ok(model.names.includes(phone), phone);
  }
});

test("the displayed mora numbering preserves small kana, closures, continuations and pauses", () => {
  const groups = makeGroups(
    [
      ["ビョ", "by o"],
      ["オ", "o"],
      ["、", "sp"],
      ["イ", "i"],
      ["ッ", "q"],
      ["テ", "t e"],
      ["ン", "N"],
    ],
    "びょう、いってん",
  );
  assert.deepEqual(
    groups.filter((g) => !g.pause).map((g) => [g.first, g.labels]),
    [
      [0, ["びょ", "う"]],
      [2, ["い"]],
      [3, ["っ"]],
      [4, ["て"]],
      [5, ["ん"]],
    ],
  );
  assert.deepEqual(groups[0].phones, ["by", "o:"]);
  assert.equal(groups[1].pause, true);
});

test("silence, a steady tone and clipped samples cannot become timing feedback", () => {
  assert.equal(features(new Float32Array(16000)).error, "quiet");
  assert.equal(
    features(
      Float32Array.from(
        { length: 16000 },
        (_, i) => 0.25 * Math.sin((2 * Math.PI * 440 * i) / 16000),
      ),
    ).error,
    "noise",
  );
  assert.equal(features(new Float32Array(16000).fill(1)).error, "clipped");
});

// 16 kHz mono signed little-endian PCM. Reference is the published ビール
// example. VOICEVOX Nemo (style 10005) synthesized the other two with only the
// second mora's vowel_length scaled to 2.4 or .28 of its original value.
// Voice/audio attribution and terms: assets/audio/CREDITS.md.
function sample(tag) {
  const bytes = readFileSync(
    new URL("./fixtures/beer-" + tag + ".pcm", import.meta.url),
  );
  return Float32Array.from(
    { length: bytes.length / 2 },
    (_, i) => bytes.readInt16LE(i * 2) / 32768,
  );
}
test("site reference and independently varied long vowel produce directional feedback on the same group", () => {
  const groups = makeGroups(plans[clipStem("ビール")], "ビール");
  const reference = measure(sample("reference"), groups, model);
  assert.equal(compareAlignment(reference, reference).target, null);
  for (const [tag, direction] of [
    ["long", 1],
    ["short", -1],
  ]) {
    const current = measure(sample(tag), groups, model);
    const result = compareAlignment(reference, current);
    assert.equal(result.status, "measured");
    assert.deepEqual(result.units[result.target].labels, ["ビ", "ー"]);
    assert.equal(Math.sign(result.units[result.target].ratio - 1), direction);
  }
  assert.equal(
    compareAlignment(reference, { error: "quiet" }).status,
    "uncertain",
  );
});
