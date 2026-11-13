import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  chapterTalks,
  chapterTurns,
  chapterAnswer,
} from "../chapter-talk-data.js";
import { lessons } from "../lessons.js";
import { createChapterBook } from "../chapter-talk-book.js";
import { clipStem } from "../clip-source.js";
import { talks } from "../talk-data.js";
test("each micro-dialogue practices only answers actually taught that day and ships separate audio for tomorrow", () => {
  const plans = JSON.parse(
    readFileSync(new URL("../assets/timing/plans.json", import.meta.url)),
  );
  assert.deepEqual(
    new Set([...chapterTalks.values()].map((p) => p.scene)),
    new Set(Object.keys(talks)),
  );
  assert.equal(chapterTalks.size, 42);
  assert.equal(chapterTurns.size, 88);
  for (const l of lessons) {
    const p = chapterTalks.get(l.id);
    assert.ok([2, 3].includes(p.turns.length));
    const taught = [...l.steps.flatMap((s) => s.examples), ...l.dialogue].map(
      (v) => v.jp,
    );
    for (const t of p.turns) {
      assert.ok(taught.includes(t.model.jp));
      assert.equal(chapterAnswer(t, t.model.jp).kind, "ok", t.key);
      assert.equal(chapterAnswer(t, "全然別の話").kind, "unclear", t.key);
      assert.notEqual(clipStem(t.first.jp), clipStem(t.alternate.jp), t.key);
      for (const v of [t.first, t.alternate, t.model])
        assert.ok(plans[clipStem(v.jp)]?.length && v.kana && v.zh, t.key);
    }
  }
  assert.equal(
    chapterAnswer(chapterTurns.get("t01.1"), "もう一度お願いします").kind,
    "ok",
  );
});
test("date-based reviews survive refresh, rotate prompts, cap the daily load, and carry overdue items", () => {
  const db = new Map(),
    storage = { getItem: (k) => db.get(k), setItem: (k, v) => db.set(k, v) };
  let day = 1200;
  const book = createChapterBook(storage, () => day);
  for (const k of ["f01.0", "f01.1", "f02.0", "f02.1"])
    book.markTurn(k, ["skip"]);
  assert.deepEqual(book.due(), []);
  assert.deepEqual(book.remaining("f01"), []);
  day++;
  const afterReload = createChapterBook(storage, () => day);
  const due = afterReload.due();
  assert.equal(due.length, 3);
  assert.ok(due.every((v) => v.variant === 1));
  for (const [i, t] of due.entries())
    afterReload.settle(t.id, i === 0 ? ["hint"] : [], true, t.variant);
  assert.deepEqual(afterReload.due(), []);
  afterReload.settle(due[1].id, ["hint"], true, 1);
  day += 4;
  const remaining = book.due();
  assert.equal(remaining.length, 2);
  assert.deepEqual(
    remaining.find((t) => t.id === due[0].id),
    { id: due[0].id, variant: 0 },
  );
  const solo = remaining.find((t) => t.id !== due[0].id);
  assert.equal(solo.variant, 1);
  assert.equal(
    [...db.values()].some((s) => s.includes("text")),
    false,
  );
});
