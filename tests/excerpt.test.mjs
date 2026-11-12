import assert from "node:assert/strict";
import test from "node:test";
import { excerptWindow, excerptWave } from "../rhythm-excerpt.js";

const labels = [
  ["こ"],
  ["の"],
  ["で"],
  ["ん"],
  ["しゃ"],
  ["は"],
  ["きょ", "う"],
  ["と"],
];
const units = labels.map((labels, i) => ({
  labels,
  first: i === 7 ? 8 : i,
  reliable: true,
  referenceStart: 100 + i * 110,
  referenceEnd: 180 + i * 110,
  start: 370 + i * 200,
  end: 507 + i * 200,
  // Grading durations deliberately differ from the raw source boundaries.
  expectedMs: 999,
  userMs: 5000,
}));

test("clip boundaries follow the two original recordings and count real morae", () => {
  const middle = excerptWindow(units, 4);
  assert.deepEqual([middle.from, middle.to], [2, 6]);
  assert.deepEqual(middle.reference, [320, 840]);
  assert.deepEqual(middle.take, [770, 1707]);
  assert.deepEqual(excerptWindow(units, 6, false).reference, [760, 840]);
  for (const [target, from, to] of [
    [0, 0, 2],
    [7, 6, 7],
    [6, 4, 7],
  ]) {
    const window = excerptWindow(units, target);
    assert.deepEqual([window.from, window.to], [from, to]);
  }
});

test("an uncertain focus cannot play and an unreliable outside edge folds inward", () => {
  const marked = units.map((u, i) => ({ ...u, reliable: i !== 2 && i !== 5 }));
  assert.equal(excerptWindow(marked, 2), null);
  const window = excerptWindow(marked, 4);
  assert.equal(window.trimmed, true);
  assert.deepEqual([window.from, window.to], [3, 6]);
});

test("the pair contains the exact samples from the two independent windows with a silent gap and fades", async () => {
  const rate = 16000,
    make = (sign) =>
      Float32Array.from(
        { length: rate },
        (_, i) => (sign * (i + 1)) / (2 * rate),
      );
  const reference = make(1),
    take = make(-1);
  const out = excerptWave(
    { reference, take },
    { reference: [-25, 125], take: [500, 1200] },
  );
  const bytes = new DataView(await out.blob.arrayBuffer());
  assert.equal(bytes.getUint32(24, true), rate);
  assert.equal(bytes.getUint32(40, true), bytes.byteLength - 44);
  assert.equal(out.referenceEnd, 0.125);
  assert.equal(out.takeStart, 0.425);
  assert.equal(out.takeEnd, 0.925);
  const get = (i) => bytes.getInt16(44 + 2 * i, true);
  assert.equal(get(0), 0);
  assert.equal(get(200), Math.round(reference[200] * 32767));
  assert.equal(get(1999), 0);
  assert.equal(get(5000), 0);
  assert.equal(get(6800 + 200), Math.round(take[8000 + 200] * 32768));
  assert.equal(get(14800), 0);
  assert.throws(() =>
    excerptWave(
      { reference, take },
      { reference: [150, 10], take: [100, 200] },
    ),
  );
});

test("the third track advances from the original sentence to the two latest local takes", async () => {
  const pcm = (x) => new Float32Array(1600).fill(x);
  const samples = { reference: pcm(0.25), take: pcm(0.5) };
  const range = { reference: [0, 100], take: [0, 100] };
  const one = { pcm: pcm(-0.25), bounds: [10, 60] },
    two = { pcm: pcm(-0.5), bounds: [30, 100] };
  for (const [history, expected] of [
    [[one], [0.25, 0.5, -0.25]],
    [
      [one, two],
      [0.25, -0.25, -0.5],
    ],
  ]) {
    const wave = excerptWave(samples, range, history);
    assert.deepEqual(
      wave.phases.map((p) => p.voice),
      ["reference", "previous", "take"],
    );
    const bytes = new DataView(await wave.blob.arrayBuffer());
    for (const [i, phase] of wave.phases.entries()) {
      const pos = Math.round(phase.start * 16000) + 100;
      assert.equal(
        bytes.getInt16(44 + 2 * pos, true),
        Math.round(expected[i] * (expected[i] < 0 ? 32768 : 32767)),
      );
      assert.ok(
        Math.abs((phase.end - phase.start) * 16000 - phase.audio.length) < 1e-5,
      );
    }
  }
});
