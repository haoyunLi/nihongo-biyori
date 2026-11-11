import test from "node:test";
import assert from "node:assert/strict";
import {
  flagListeningMiss,
  matchesRomaji,
  newRound,
  pendingCard,
  planDay,
  recallCards,
  recordRating,
} from "../recall.js";

const empty = { done: [], kanaDone: [], saved: [], mistakes: [] };

test("a failed item returns once at the end and remains due tomorrow after a retry", () => {
  const day = 1234,
    book = { history: {}, round: newRound(day, planDay(empty, {}, day)) };
  assert.equal(book.round.ids.length, 5);
  const [first, ...rest] = book.round.ids;
  assert.ok(recordRating(book, day, first, "first", false));
  assert.equal(recordRating(book, day, first, "first", true), false);
  for (const id of rest) assert.ok(recordRating(book, day, id, "first", true));
  assert.deepEqual(pendingCard(book.round), { id: first, phase: "retry" });
  assert.ok(recordRating(book, day, first, "retry", true));
  assert.equal(pendingCard(book.round), null);
  assert.deepEqual(book.history[first], { level: 0, due: day + 1 });
});

test("a new row does not displace due cards learned in the initial vowel round", () => {
  const day = 200,
    book = { history: {}, round: newRound(day, planDay(empty, {}, day)) };
  for (const id of book.round.ids) recordRating(book, day, id, "first", true);
  const newState = { ...empty, kanaDone: ["ka"] };
  const next = planDay(newState, book.history, day + 1);
  assert.deepEqual(new Set(next.ids), new Set(book.round.ids));
  book.round = newRound(day + 1, next);
  for (const id of book.round.ids)
    recordRating(book, day + 1, id, "first", true);
  assert.ok(book.round.ids.every((id) => book.history[id].due === day + 4));
});

test("a missed guide word becomes eligible without requiring the entire row to be finished", () => {
  const day = 300,
    book = { history: {}, round: null },
    word = "word:ka:切符";
  assert.ok(recallCards.has(word));
  assert.ok(flagListeningMiss(book, word, day));
  assert.equal(flagListeningMiss(book, word, day), false);
  const plan = planDay(empty, book.history, day);
  assert.equal(plan.warmup, false);
  assert.deepEqual(plan.ids, [word]);
  book.round = newRound(day, plan);
  assert.ok(recordRating(book, day, word, "first", true));
  assert.ok(flagListeningMiss(book, word, day));
  assert.equal(book.history[word].due, day + 1);
  assert.equal(pendingCard(book.round), null);
});

test("duplicate saved examples of one phrase give just one card per round", () => {
  const p = planDay(
    {
      ...empty,
      done: ["t04"],
      saved: ["t04.d0", "t04.s1.0"],
      mistakes: ["t04:0"],
    },
    {},
    987,
  );
  assert.equal(
    new Set(p.ids.map((id) => recallCards.get(id).signature)).size,
    p.ids.length,
  );
  assert.ok(p.ids.includes("mistake:t04:0"));
  assert.ok(p.ids.length <= 5);
});

test("audio-only prompts accept spellings of indistinguishable modern sounds", () => {
  const o = recallCards.get("kana:お").item;
  assert.ok(matchesRomaji(o, " ＷＯ ", true));
  assert.equal(matchesRomaji(o, "wo", false), false);
  assert.ok(matchesRomaji(recallCards.get("kana:じ").item, "di", true));
});
