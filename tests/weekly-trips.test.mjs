import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { weeklyTrips } from "../weekly-trips.js";
import { units } from "../chapter-path.js";
import { chapterTurns, chapterAnswer } from "../chapter-talk-data.js";
import { lessons } from "../lessons.js";
import { clipStem } from "../clip-source.js";
import { createChapterBook } from "../chapter-talk-book.js";

test("six itineraries end the right weeks, transfer taught replies across scenes, and ship fresh, distinct voiced questions", () => {
  const plans = JSON.parse(
    readFileSync(new URL("../assets/timing/plans.json", import.meta.url)),
  );
  const scenes = new Set();
  assert.equal(weeklyTrips.length, units.length);
  for (const [i, t] of weeklyTrips.entries()) {
    assert.equal(t.chapter, units[i].ids.at(-1));
    assert.ok(
      t.stops.length >= 3 && t.turns.length >= 4 && t.turns.length <= 5,
    );
    assert.equal(new Set(t.turns.map((q) => q.id)).size, t.turns.length);
    const weekScenes = new Set();
    const l = lessons.find((l) => l.id === t.chapter);
    assert.equal(l.minutes, 14);
    assert.equal(l.stageMinutes.at(-1), t.minutes);
    for (const v of t.turns) {
      const src = chapterTurns.get(v.id);
      assert.ok(units[i].ids.includes(src.lesson));
      weekScenes.add(src.scene);
      scenes.add(src.scene);
      assert.equal(chapterAnswer(src, src.model.jp).kind, "ok");
      const files = [v.cue, src.first, src.alternate].map((x) =>
        clipStem(x.jp),
      );
      assert.equal(new Set(files).size, 3, v.id);
      for (const f of files) {
        assert.ok(plans[f]?.length);
        assert.ok(
          statSync(new URL("../assets/audio/" + f + ".mp3", import.meta.url))
            .size > 500,
        );
      }
      assert.ok(v.cue.kana && v.cue.zh && t.stops[v.stop].setting);
    }
    assert.ok(weekScenes.size >= 3);
  }
  assert.equal(scenes.size, 9);
});
test("all five weekly misses take precedence together next day, share daily keys, rotate and never advance component lessons", () => {
  const rows = new Map(),
    storage = {
      getItem: (k) => rows.get(k),
      setItem: (k, v) => rows.set(k, v),
    };
  let day = 40;
  const book = createChapterBook(storage, () => day),
    id = "t04",
    { turns } = weeklyTrips[1];
  // Resume a pre-encounter itinerary saved by the previous release.
  book.patch("week:" + id, { answers: {} });
  book.markTurn("f01.0", ["skip"]);
  day++;
  book.markTurn(turns[0].id, ["skip"]);
  for (const [i, v] of turns.entries()) {
    book.tripHelp(id, v.id, i === 1 ? "model" : "skip");
    book.tripAnswer(id, v.id, []);
  }
  assert.ok(book.tripState(id).complete);
  assert.equal(book.checkpoint("c01").talk, undefined);
  assert.equal(book.due().length, 1);
  day++;
  const resume = createChapterBook(storage, () => day),
    due = resume.due();
  assert.deepEqual(
    new Set(due.map((x) => x.id)),
    new Set(turns.map((x) => x.id)),
  );
  assert.ok(due.every((x) => x.trip === id && x.variant === 1));
  assert.equal(resume.reviewMinutes(), 3);
  for (const [i, q] of due.entries())
    resume.settle(q.id, i === 0 ? ["hint"] : [], true, q.variant);
  assert.equal(resume.due().length, 0);
  assert.equal(resume.reviewMinutes(), 3);
  day += 3;
  assert.ok(resume.due().some((x) => x.id === due[0].id && x.variant === 0));
  assert.ok(resume.due().some((x) => x.id === "f01.0"));
  resume.restartTrip(id);
  assert.equal(resume.tripState(id).items.length, 5);
  assert.equal(resume.due().length, 2);
});
test("help is saved before leaving the turn; returning after clearing its retry does not queue that old miss a second time", () => {
  const rows = new Map(),
    storage = {
      getItem: (k) => rows.get(k),
      setItem: (k, v) => rows.set(k, v),
    };
  let day = 1;
  const book = createChapterBook(storage, () => day),
    id = "f07",
    key = "f04.0";
  book.tripHelp(id, key, "unclear");
  assert.equal(book.tripState(id).items[0].id, key);
  day++;
  const retry = book.due()[0];
  book.settle(key, [], true, retry.variant);
  book.tripAnswer(id, key, []);
  assert.deepEqual(book.tripState(id).records, [
    { id: key, flags: ["unclear"] },
  ]);
  day++;
  assert.deepEqual(book.due(), []);
});

test("opening another module version cannot duplicate a week's preparation or quiz", async () => {
  const count = () =>
    lessons.map((l) => [l.quiz.length, ...l.steps.map((s) => s.body)]);
  const before = count();
  await import("../lessons.js?previous-or-new-client");
  assert.deepEqual(count(), before);
});
