import assert from "node:assert/strict";
import test from "node:test";
import { statSync } from "node:fs";
import {
  assignedAnswer,
  assignedEntry,
  tripAttempt,
} from "../trip-encounters.js";
import { weeklyTrips } from "../weekly-trips.js";
import { createChapterBook } from "../chapter-talk-book.js";
import { clockSpeech, proposalLines, readProposal } from "../trip-questions.js";
import { clipStem } from "../clip-source.js";
const texts = [
  "切手はありますか",
  "他におすすめはありますか",
  "すみません、他に何かお勧めはありますか",
  "別の色はありますか",
  "ここから歩いて何分ですか",
  "４時半はどうですか",
];
test("the learner can start a question directly in either edition in each week, and hears an answered question before the next task", () => {
  for (const [w, base] of weeklyTrips.entries())
    for (let edition = 0; edition < 2; edition++) {
      const root = assignedEntry("w" + (w + 1) + "." + edition);
      const decision = assignedAnswer(root, texts[w]);
      assert.equal(decision.kind, "ok", texts[w]);
      assert.equal(decision.choice, root.initiative);
      assert.equal(
        assignedAnswer(root, root.answers[0].model.jp, undefined, {
          initiating: true,
        }).kind,
        w === 5 ? "ok" : "unclear",
      );
      const route = tripAttempt(
        base,
        edition,
        { [root.key]: decision.choice },
        { [root.key]: decision.proposal },
      );
      const next =
        route.turns[route.turns.findIndex((t) => t.id === root.key) + 1];
      assert.equal(route.turns.length, base.turns.length);
      assert.equal(next.id, root.choices[root.initiative].id + (w===5 ? ".exit" : ""));
      assert.ok(clipStem(next.cue.jp));
      assert.notEqual(root.initiativeRetry.jp, root.first.jp);
      assert.ok(clipStem(root.initiativeRetry.jp));
    }
  assert.equal(
    assignedAnswer(assignedEntry("w3.1"), "おすすめはありません").kind,
    "unclear",
  );
  assert.equal(assignedAnswer(assignedEntry("w1.0"), "切手").kind, "unclear");
});
test("custom time proposals retain day and quarter-hour, reject ambiguous or negative requests, and have playable Japanese audio", () => {
  for (const day of ["today", "tomorrow"])
    for (let hour = 12; hour <= 18; hour++)
      for (const minute of [0, 15, 30, 45]) {
        const p = { day, hour, minute };
        const l = proposalLines(p);
        for (const text of [l.model.jp, l.model.kana])
          assert.deepEqual(readProposal(text, 1), p, text);
      }
  for (const v of clockSpeech) {
    const stem = clipStem(v.jp);
    assert.ok(stem, v.jp);
    assert.ok(
      statSync(new URL("../assets/audio/" + stem + ".mp3", import.meta.url))
        .size > 500,
    );
  }
  for (const text of [
    "二時か四時半",
    "午後四時半は無理です",
    "午前四時半",
    "16:03にしよう",
    "四時半には行けません",
  ])
    assert.equal(readProposal(text, 1), undefined, text);
  assert.deepEqual(
    readProposal("三時じゃなくて、明日の16:15はどうですか？", 1),
    { day: "tomorrow", hour: 16, minute: 15 },
  );
});
test("a supported initiative survives refresh, is reviewed with the same concrete time and a different prompt even after replay, then clears", () => {
  const rows = new Map(),
    s = { getItem: (k) => rows.get(k), setItem: (k, v) => rows.set(k, v) };
  let day = 8;
  const b = createChapterBook(s, () => day),
    id = "x14";
  b.restartTrip(id);
  const root = assignedEntry("w6.1");
  b.startQuestion(id, root.key);
  b.tripHelp(id, root.key, "hint");
  assert.ok(createChapterBook(s, () => day).tripState(id).items[0].initiating);
  const r = assignedAnswer(root, "今日の二時半はどうですか");
  b.tripAnswer(id, root.key, [], r.choice, false, r.proposal);
  const follow = b.tripState(id).items[0];
  assert.match(follow.id, /later$/);
  assert.match(follow.lead.jp, /今日の二時半/);
  const next = assignedEntry(follow.id);
  b.tripHelp(id, next.key, "hint");
  const revised = assignedAnswer(next, "明日の四時半はどうですか");
  b.tripAnswer(id, next.key, [], revised.choice, false, revised.proposal);
  assert.match(b.tripState(id).items[0].lead.jp, /明日の四時半/);
  b.restartTrip(id);
  assert.equal(b.due().length, 0);
  day++;
  const due = b.due();
  assert.deepEqual(
    due.map((x) => x.id),
    [root.key, next.key],
  );
  for (const item of due) {
    const entry = assignedEntry(item.id);
    assert.equal(item.variant, 1);
    assert.equal(
      assignedAnswer(entry, "明日の三時はどうですか", item.choice, item).kind,
      "unclear",
    );
    const answer = proposalLines(item.proposal).model.jp;
    assert.equal(assignedAnswer(entry, answer, item.choice, item).kind, "ok");
    b.settle(
      item.id,
      [],
      true,
      item.variant,
      undefined,
      item.choice,
      item.proposal,
    );
  }
  day++;
  assert.equal(b.due().length, 0);
});
