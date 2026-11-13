import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { lessons } from "../lessons.js?v=10";
import { units, chapterIds, dailyChapter } from "../chapter-path.js";
import { questions } from "../question-bank.js";
import { recallCards, planDay } from "../recall.js?v=10";
import { sources } from "../screen-lessons.js";
import { tripTasks } from "../travel-finish.js";
import { clipStem } from "../clip-source.js?v=10";
const plans = JSON.parse(
  readFileSync(new URL("../assets/timing/plans.json", import.meta.url)),
);
test("six weeks cover each chapter once and resume actual progress across calendar gaps", () => {
  assert.deepEqual(
    units.map((x) => x.ids.length),
    [7, 7, 7, 7, 7, 7],
  );
  assert.deepEqual([...chapterIds].sort(), lessons.map((l) => l.id).sort());
  assert.equal(chapterIds[27], "t09");
  assert.equal(dailyChapter(chapterIds.slice(0, 28), {}, 50).next, "x01");
  assert.equal(chapterIds.at(-1), "x14");
  const done = ["f01", "c01"],
    days = { f01: 10 };
  assert.deepEqual(dailyChapter(done, days, 10), {
    next: "f02",
    today: ["f01"],
    complete: false,
  });
  assert.deepEqual(dailyChapter(done, days, 50), {
    next: "f02",
    today: [],
    complete: false,
  });
  assert.deepEqual(dailyChapter(chapterIds, {}, 50), {
    next: undefined,
    today: [],
    complete: true,
  });
});
test("each wrong-answer entry has a valid retry, a voiced correction, an exact source and a review card", () => {
  for (const [id, q] of questions) {
    assert.ok(q.options[q.answer] && q.why && q.category && q.label, id);
    assert.ok(new Set(q.options).size === q.options.length, id);
    assert.ok(
      plans[
        clipStem(q.model.audio || q.model.jp, q.model.kana, q.model.learner)
      ],
      id,
    );
    if (q.listen) assert.ok(plans[clipStem(q.listen)], id);
    assert.ok(recallCards.has(id) || recallCards.has("mistake:" + id), id);
    if (q.lesson) {
      assert.ok(
        lessons.find((l) => l.id === q.lesson)?.steps[
          Number(q.source.split("/").at(-1))
        ],
        id,
      );
    }
  }
  const old = "t04:0";
  assert.ok(
    planDay(
      { done: [], saved: [], mistakes: [old], kanaDone: [] },
      {},
      5,
    ).ids.includes("mistake:" + old),
  );
});
test("source excerpts, original practice lines and final travel tasks have usable learning audio", () => {
  const seen = new Set();
  for (const l of lessons)
    for (const s of l.steps)
      for (const e of s.examples) {
        if (e.source) {
          assert.ok(sources[e.source]?.url.startsWith("https:"));
          seen.add(e.source);
        }
      }
  assert.equal(seen.size, Object.keys(sources).length);
  assert.equal(tripTasks.length, 5);
  for (const t of tripTasks)
    for (const v of [t.cue, t.model, t.extra].filter(Boolean))
      assert.ok(plans[clipStem(v.jp, v.kana)], v.jp);
});
