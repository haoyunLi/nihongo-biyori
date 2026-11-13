import assert from "node:assert/strict";
import test from "node:test";
import {
  families,
  replies,
  mixed,
  guided,
  dailyCounters,
  finalCues,
  finalQuizCue,
  availableExample,
} from "../counter-data.js";
import { counterRound, counterLessonLinks } from "../counter-view.js";
import { lessons } from "../lessons.js";
import { questions } from "../question-bank.js";
import { recallCards } from "../recall.js";
import { clipStem } from "../clip-source.js";
import { readFileSync, statSync } from "node:fs";

test("lunch uses only chapter 14, and the next six rounds switch every clerk cue", () => {
  const keys = Object.keys(families);
  for (const rng of [() => 0, () => 0.5, () => 0.9999, Math.random]) {
    for (const groups of [keys, ["order", "count", "place"]]) {
      const a = counterRound([], rng, groups),
        b = counterRound(
          a.map((q) => q.id),
          rng,
          groups,
        );
      assert.deepEqual(a.map((q) => q.family).sort(), [...groups].sort());
      assert.equal(
        new Set([...a, ...b].map((q) => q.id)).size,
        groups.length * 2,
      );
    }
  }
  assert.ok(counterLessonLinks("t04").includes("/lunch"));
  assert.ok(counterLessonLinks("t07").includes("/mixed"));
});

test("daily, mixed and final exams have separate prompts; mistakes keep the exact original clip", () => {
  const lessonLines = lessons
    .flatMap((l) => [...l.steps.flatMap((s) => s.examples), ...l.dialogue])
    .map((v) => v.jp);
  const taught = new Set([
    ...lessonLines,
    ...Object.values(families).flatMap((f) => f.examples.map((v) => v.jp)),
    availableExample.jp,
  ]);
  const held = [
    ...mixed.map((q) => q.cue),
    ...dailyCounters.map((q) => q.cue),
    ...finalCues,
    finalQuizCue,
  ];
  assert.equal(new Set(held.map((v) => v.jp)).size, held.length);
  assert.ok(held.every((v) => !taught.has(v.jp)));
  const plans = JSON.parse(
    readFileSync(new URL("../assets/timing/plans.json", import.meta.url)),
  );
  for (const line of [
    ...held,
    ...Object.values(replies),
    ...Object.values(families).flatMap((f) => f.examples),
    availableExample,
  ]) {
    const stem = clipStem(line.jp);
    assert.ok(stem && plans[stem]?.length, line.jp);
    assert.ok(
      statSync(new URL("../assets/audio/" + stem + ".mp3", import.meta.url))
        .size > 500,
      line.jp,
    );
  }
  for (const q of [...guided, ...mixed]) {
    const key = "counter:" + q.id,
      saved = questions.get(key);
    assert.equal(saved.listen, q.cue.jp);
    assert.equal(saved.options[saved.answer], q.model.jp);
    assert.equal(saved.source, "#practice/counter/" + q.family);
    assert.equal(recallCards.get("mistake:" + key).q.listen, q.cue.jp);
  }
  for (const q of dailyCounters) {
    const [id, n] = families[q.family].step,
      l = lessons.find((l) => l.id === id),
      i = l.quiz.length - 1;
    assert.equal(l.quiz[i].listen, q.cue.jp);
    assert.equal(questions.get(id + ":" + i).source, "#lesson/" + id + "/" + n);
  }
});

test("meaningful choices include the opposite outcome despite identical customer plans", () => {
  const scenarios = (family) => mixed.filter((q) => q.family === family);
  const stock = scenarios("stock");
  assert.equal(stock[0].goal, stock[1].goal);
  assert.deepEqual(
    new Set(stock.map((q) => q.model.jp)),
    new Set([replies.change.jp, replies.fish.jp]),
  );
  for (const q of stock)
    assert.ok(
      [replies.change.jp, replies.fish.jp].every((v) => q.options.includes(v)),
    );
  for (const [family, first, second] of [
    ["place", "in", "out"],
    ["pay", "card", "cash"],
  ]) {
    const items = scenarios(family);
    assert.deepEqual(
      new Set(items.map((q) => q.model.jp)),
      new Set([replies[first].jp, replies[second].jp]),
    );
  }
});
