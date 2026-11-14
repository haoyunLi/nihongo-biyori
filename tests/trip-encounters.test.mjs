import assert from "node:assert/strict";
import test from "node:test";
import { statSync, readFileSync } from "node:fs";
import { clipStem } from "../clip-source.js";
import { weeklyTrips } from "../weekly-trips.js";
import {
  tripAttempt,
  assignedEntry,
  assignedAnswer,
} from "../trip-encounters.js";
import { createChapterBook } from "../chapter-talk-book.js";
import { chapterIds } from "../chapter-path.js";
import { lessons } from "../lessons.js";
const store = () => {
  const db = new Map();
  return { getItem: (k) => db.get(k), setItem: (k, v) => db.set(k, v) };
};
test("all 24 branches stay within the week, ship distinct voiced transfer cues, and save the chosen path across reload", () => {
  const plans = JSON.parse(
    readFileSync(new URL("../assets/timing/plans.json", import.meta.url)),
  );
  for (const base of weeklyTrips)
    for (const side of [0, 1]) {
      const storage = store(),
        book = createChapterBook(storage, () => 10),
        id = base.chapter;
      const known = new Set(
        lessons
          .filter((l) => chapterIds.indexOf(l.id) < base.week * 7)
          .flatMap((l) =>
            [...l.steps.flatMap((s) => s.examples), ...l.dialogue].map(
              (s) => s.jp,
            ),
          ),
      );
      for (let edition = 0; edition < 2; edition++) {
        const p = tripAttempt(base, edition);
        assert.equal(p.turns.length, base.turns.length);
        const decision = p.turns.find((t) => assignedEntry(t.id).choices),
          root = assignedEntry(decision.id);
        const forks = root.choices.map((o) => assignedEntry(o.id));
        assert.notEqual(forks[0].first.jp, forks[1].first.jp);
        assert.notEqual(forks[0].model.jp, forks[1].model.jp);
        for (const n of [root, ...forks]) {
          assert.notEqual(n.first.jp, n.alternate.jp);
          for (const l of [
            n.first,
            n.alternate,
            ...n.answers.map((q) => q.model),
          ]) {
            const f = clipStem(l.jp);
            assert.ok(plans[f]?.length, l.jp);
            assert.ok(
              statSync(
                new URL("../assets/audio/" + f + ".mp3", import.meta.url),
              ).size > 500,
            );
          }
          for (const a of n.answers)
            assert.ok(known.has(a.model.jp), a.model.jp);
        }
        while (!book.tripState(id).complete) {
          const cur = book.tripState(id).items[0],
            n = assignedEntry(cur.id);
          const model = n.choices ? n.answers[side].model : n.model;
          const ans = assignedAnswer(n, model.jp);
          assert.equal(ans.kind, "ok", cur.id);
          book.tripAnswer(id, cur.id, [], ans.choice);
          const reloaded = createChapterBook(storage, () => 10).tripState(id);
          if (n.choices) {
            assert.equal(reloaded.items[0].id, n.choices[side].id);
            assert.equal(reloaded.trip.outcome, n.choices[side].ending);
          }
        }
        assert.equal(book.tripState(id).records.length, base.turns.length);
        if (edition === 0) {
          book.restartTrip(id);
          assert.notEqual(book.tripState(id).trip.encounter, p.encounter);
        }
      }
    }
});
test("a spoken correction changes the next question; bare mentions, unavailable times and ambiguous orders do not advance", () => {
  const food = assignedEntry("w3.1"),
    time = assignedEntry("w6.1");
  for (const [n, raw, choice] of [
    [food, "カレーにします", 0],
    [food, "カレーじゃなくて、お会計をお願いします", 1],
    [food, "カレーは要りません、お会計お願いします", 1],
    [time, "3時でも大丈夫です", 0],
    [time, "今日はちょっと、明日なら大丈夫です", 1],
    [time, "明日がいいです", 1],
  ])
    assert.equal(assignedAnswer(n, raw).choice, choice, raw);
  for (const [n, raw] of [
    [time, "三時は無理です"],
    [time, "二時がいいです"],
    [time, "三時か明日"],
    [food, "カレーは要りません"],
    [food, "カレーとお会計"],
  ])
    assert.equal(assignedAnswer(n, raw).kind, "unclear", raw);
  assert.equal(assignedAnswer(food, "もう一度お願いします").kind, "repeat");
  assert.equal(
    assignedAnswer(assignedEntry("w3.1.1"), "カードでお願いします").kind,
    "ok",
  );
});
test("a mistake is retried in its own situation on a later day even after a different itinerary is started", () => {
  const storage = store();
  let day = 52;
  const book = createChapterBook(storage, () => day);
  const id = "x14";
  book.restartTrip(id);
  const root = assignedEntry("w6.1");
  book.tripHelp(id, root.key, "unclear");
  book.tripHelp(id, root.key, "hint");
  book.tripAnswer(id, root.key, [], 1);
  const follow = book.tripState(id).items[0];
  assert.equal(follow.id, root.choices[1].id);
  book.tripHelp(id, follow.id, "skip");
  book.tripAnswer(id, follow.id, ["skip"]);
  assert.deepEqual(book.due(), []);
  book.restartTrip(id);
  day++;
  const after = createChapterBook(storage, () => day);
  const due = after.due();
  assert.deepEqual(
    due.map((i) => i.id),
    [root.key, follow.id],
  );
  assert.ok(due.every((i) => i.variant === 1 && i.trip === id));
  assert.equal(due[0].choice, 1);
  assert.equal(
    assignedAnswer(root, "三時がいいです", due[0].choice).kind,
    "unclear",
  );
  assert.equal(
    assignedAnswer(root, "明日なら大丈夫です", due[0].choice).kind,
    "ok",
  );
  for (const i of due) after.settle(i.id, [], true, i.variant);
  day++;
  assert.deepEqual(after.due(), []);
});
