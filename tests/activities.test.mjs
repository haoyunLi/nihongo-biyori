import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { clipStem } from "../clip-source.js?v=9";
import { makeGroups } from "../mora-groups.js";
import { rhythmCard, rhythmTypes } from "../rhythm-review.js";
import { activitySpeech, animeScenes, station } from "../activity-data.js";
import {
  scheduleRhythm,
  planDay,
  newRound,
  recordRating,
  readBook,
} from "../recall.js";
const plans = JSON.parse(
  readFileSync(new URL("../assets/timing/plans.json", import.meta.url)),
);
const examples = [
  {
    type: "closure",
    jp: "切手",
    audio: "きって",
    kana: "きって",
    first: 1,
    count: 1,
  },
  {
    type: "vowel",
    jp: "ビール",
    audio: "ビール",
    kana: "ビール",
    first: 0,
    count: 2,
  },
  {
    type: "nasal",
    jp: "本屋",
    audio: "ほんや",
    kana: "ほんや",
    first: 1,
    count: 1,
  },
].map((item) => ({ ...item, learner: false, zh: "" }));

test("marked beats are scheduled for the next local day and survive grading and reload", () => {
  const book = { history: {}, round: null },
    state = { done: [], saved: [], mistakes: [], kanaDone: [] };
  for (const entry of examples) {
    assert.equal(scheduleRhythm(book, entry, 100), true);
    assert.equal(scheduleRhythm(book, entry, 100), false);
    const card = rhythmCard(entry);
    assert.notEqual(card.item.kana, card.transfer.kana);
    const groups = makeGroups(
      plans[
        clipStem(card.transfer.audio || card.transfer.jp, card.transfer.kana)
      ],
      card.transfer.kana,
    );
    const target = groups.find((g) => g.first === card.transfer.first);
    assert.ok(
      entry.type === "closure"
        ? target.phones.includes("q")
        : entry.type === "nasal"
          ? target.phones.includes("N")
          : target.labels.length > 1,
    );
  }
  assert.deepEqual(planDay(state, book.history, 100).ids, []);
  const plan = planDay(state, book.history, 101);
  assert.equal(plan.ids.length, 3);
  book.round = newRound(101, plan);
  const first = plan.ids[0];
  assert.ok(recordRating(book, 101, first, "first", true));
  assert.equal(book.history[first].due, 102);
  const saved = JSON.stringify(book);
  const old = globalThis.localStorage;
  try {
    globalThis.localStorage = { getItem: () => saved };
    assert.deepEqual(readBook(), book);
  } finally {
    if (old === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = old;
  }
  assert.equal(rhythmCard({ ...examples[0], first: 999 }), null);
});

test("all activity voices and transfer words have real clips and timing plans", () => {
  for (const v of [
    ...activitySpeech,
    ...Object.values(rhythmTypes).flatMap((t) => t.words),
  ]) {
    const stem = clipStem(v.audio || v.jp, v.kana, v.learner);
    assert.ok(plans[stem], v.jp);
    assert.ok(
      existsSync(new URL("../assets/audio/" + stem + ".mp3", import.meta.url)),
    );
  }
  assert.equal(new Set(station.platforms.map((v) => clipStem(v.jp))).size, 3);
  for (const s of animeScenes) {
    assert.equal(s.lines.length, 2);
    assert.notEqual(s.lines[0].learner, s.lines[1].learner);
    assert.ok(s.options[s.answer]);
    assert.notEqual(clipStem(s.full.jp), clipStem(s.casual.jp));
  }
});
