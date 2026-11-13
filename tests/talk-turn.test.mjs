import test from "node:test";
import assert from "node:assert/strict";
import { endpoint, canAutoReply } from "../talk-turn.js";
import { lessons } from "../lessons.js";
import { chapterIds, dailyChapter } from "../chapter-path.js";
import { talks } from "../talk-data.js";
test("a short pause between words stays in one utterance; silence alone cannot answer", () => {
  const block = (v) => new Float32Array(160).fill(v);
  function feed(d, n, value) {
    let state;
    for (let i = 0; i < n; i++) state = d(block(value));
    return state;
  }
  const d = endpoint(16000);
  assert.equal(feed(d, 30, 0.05), "speech");
  assert.equal(feed(d, 105, 0), "speech");
  assert.equal(feed(d, 30, 0.04), "speech");
  assert.equal(feed(d, 148, 0), "end");
  const silent = endpoint(16000);
  assert.equal(feed(silent, 1201, 0.0005), "empty");
  const tap = endpoint(16000);
  feed(tap, 2, 0.2);
  assert.equal(feed(tap, 1201, 0), "empty");
});
test("automatic sending requires confident constituent words, a complete ending, and a valid response to THIS prompt", () => {
  const sample = {
    text: "二つください",
    words: [{ conf: 0.95 }, { conf: 0.98 }],
  };
  const result = { kind: "ok" };
  assert.ok(canAutoReply(sample, result, "end"));
  for (const reason of ["empty", "limit", "manual"])
    assert.equal(canAutoReply(sample, result, reason), false);
  assert.equal(canAutoReply(sample, { kind: "unclear" }, "end"), false);
  assert.equal(
    canAutoReply({ ...sample, text: "カレーを" }, result, "end"),
    false,
  );
  assert.equal(
    canAutoReply(
      { ...sample, words: [{ conf: 1 }, { conf: 1 }, { conf: 0.49 }] },
      result,
      "end",
    ),
    false,
  );
  assert.equal(canAutoReply({ ...sample, words: [] }, result, "end"), false);
});
test("polite suffix uncertainty can pass, but a doubtful destination or quantity cannot", () => {
  const words = [
    { word: "持ち帰り", conf: 0.98 },
    { word: "で", conf: 0.95 },
    { word: "お", conf: 0.44 },
    { word: "願い", conf: 0.44 },
    { word: "し", conf: 0.9 },
    { word: "ます", conf: 1 },
  ];
  const result = { text: words.map((w) => w.word).join(""), words };
  assert.ok(canAutoReply(result, { kind: "ok" }, "end"));
  words[0].conf = 0.49;
  assert.equal(canAutoReply(result, { kind: "ok" }, "end"), false);
  const count = {
    text: "二枚ください",
    words: [
      { word: "二", conf: 0.45 },
      { word: "枚", conf: 0.99 },
      { word: "ください", conf: 1 },
    ],
  };
  assert.equal(canAutoReply(count, { kind: "ok" }, "end"), false);
});
test("all 42 daily budgets span every actual learning step; the old graduation resumes at day 29", () => {
  assert.equal(chapterIds.length, 42);
  assert.equal(Object.keys(talks).length, 9);
  assert.equal(dailyChapter(chapterIds.slice(0, 28), {}, 12).next, "x01");
  for (const l of lessons) {
    assert.ok(l.minutes >= 10 && l.minutes <= 15);
    assert.equal(l.stageMinutes.length, l.steps.length + 3);
    assert.equal(
      l.stageMinutes.reduce((a, b) => a + b, l.reviewMinutes),
      l.minutes,
    );
  }
  for (const id of chapterIds.slice(28)) {
    const l = lessons.find((v) => v.id === id);
    assert.ok(talks[l.scene]);
    assert.ok(l.quiz.length >= 2);
    assert.ok(l.dialogue.filter((v) => v.who.startsWith("你")).length >= 2);
  }
});
