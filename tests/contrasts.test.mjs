import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { contrasts, listeningRound } from "../contrast-data.js";
import { clips } from "../assets/audio/catalog.js";
import { contrastClips } from "../assets/audio/contrasts.js";
import { flagListeningMiss, planDay, recallCards } from "../recall.js";

test("each blind exercise uses two different audio files and keeps the same answer in review", () => {
  for (const pair of contrasts) {
    const stems = pair.items.map(
      (s) => clips[s.audio] || contrastClips[s.audio],
    );
    assert.notEqual(stems[0], stems[1]);
    for (const [i, s] of pair.items.entries()) {
      assert.ok(
        existsSync(
          new URL("../assets/audio/" + stems[i] + ".mp3", import.meta.url),
        ),
        s.jp,
      );
      assert.ok(s.focus.every((k) => k >= 0 && k < s.beats.length));
      const id = "contrast:" + pair.id + ":" + i,
        book = { history: {}, round: null };
      assert.equal(recallCards.get(id).q.listen, s.audio);
      assert.equal(recallCards.get(id).q.answer, i);
      flagListeningMiss(book, id, 5);
      assert.deepEqual(
        planDay(
          { done: [], saved: [], mistakes: [], kanaDone: [] },
          book.history,
          5,
        ).ids,
        [id],
      );
    }
  }
});

test("each four-question round samples both sounds twice", () => {
  for (const seed of [0, 0.11, 0.51, 0.83, 0.999]) {
    assert.deepEqual(listeningRound(() => seed).sort(), [0, 0, 1, 1]);
  }
});
