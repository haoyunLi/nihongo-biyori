import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { assignedEntry, assignedAnswer } from "../trip-encounters.js";
import { proposalLines } from "../trip-questions.js";
import { weeklyTrips } from "../weekly-trips.js";
import { clipStem } from "../clip-source.js";
import { createChapterBook } from "../chapter-talk-book.js";
const timings = JSON.parse(
  readFileSync(new URL("../assets/timing/plans.json", import.meta.url)),
);
const audio = (line) => {
  const stem = clipStem(line.jp);
  assert.ok(
    timings[stem]?.length &&
      statSync(new URL("../assets/audio/" + stem + ".mp3", import.meta.url))
        .size > 500,
    line.jp,
  );
};
const next = (book, id) => book.tripState(id).items[0];
function visit(base, v) {
  const rows = new Map(),
    storage = {
      getItem: (k) => rows.get(k),
      setItem: (k, x) => rows.set(k, x),
    };
  let day = 70;
  const reload = () => createChapterBook(storage, () => day);
  const book = reload();
  if (v) book.restartTrip(base.chapter);
  const id = base.chapter,
    root = assignedEntry("w" + base.week + "." + v);
  function send(text, flags = []) {
    const cur = next(book, id),
      n = assignedEntry(cur.id);
    for (const f of flags) book.tripHelp(id, cur.id, f);
    const r = assignedAnswer(n, text, undefined, cur);
    assert.equal(r.kind, "ok", text);
    book.tripAnswer(id, cur.id, flags, r.choice, false, r.proposal);
    return r;
  }
  while (next(book, id).id !== root.key)
    send(assignedEntry(next(book, id).id).model.jp);
  return { book, id, send, root, reload, tomorrow: () => ++day };
}
test("five trips allow a second, on-topic question in either edition, followed by two independent decisions and voiced receipts", () => {
  for (const base of weeklyTrips.slice(0, 5))
    for (const v of [0, 1])
      for (const decision of [0, 1]) {
        const { book, id, root, send, reload, tomorrow } = visit(base, v);
        send(root.answers[root.initiative].model.jp);
        const stage = next(book, id),
          item = assignedEntry(stage.id);
        assert.ok(item.followup);
        book.startQuestion(id, stage.id);
        assert.ok(next(reload(), id).initiating);
        assert.equal(
          assignedAnswer(item, "明日の三時はどうですか").kind,
          "unclear",
        );
        audio(item.initiativeRetry);
        assert.notEqual(item.initiativeRetry.jp, item.first.jp);
        send(item.answers[item.initiative].model.kana, ["hint"]);
        const cur = next(reload(), id),
          n = assignedEntry(cur.id);
        assert.ok(n.decision);
        audio(n.first);
        audio(n.alternate);
        assert.notEqual(n.first.jp, n.alternate.jp);
        if (base.week === 3)
          assert.match(n.first.jp, v === 0 ? /甘口/ : /辛口/);
        const a = n.choices[decision],
          r = send(a.model.jp, ["text"]);
        assert.deepEqual(r.replies, [a.ack]);
        audio(a.ack);
        assert.match(book.tripState(id).trip.outcome, new RegExp(a.ending));
        book.restartTrip(id);
        tomorrow();
        for (const q of book.due()) {
          const e = assignedEntry(q.id);
          assert.equal(q.variant, 1);
          assert.equal(
            q.choice,
            q.id === item.key ? item.initiative : decision,
          );
          assert.ok(
            assignedAnswer(e, e.answers[q.choice].model.jp, q.choice, q)
              .kind === "ok",
          );
        }
        assert.equal(book.due().length, 2);
      }
});
test("confirmed time, corrected exit, voiced confirmation, next stop and next-day transfer all agree even across replay and refresh", () => {
  const base = weeklyTrips[5];
  for (const v of [0, 1])
    for (const gate of [0, 1, 2, 3]) {
      const { book, id, root, send, reload, tomorrow } = visit(base, v);
      const r = send("明日の四時半はどうですか");
      const cur = next(reload(), id),
        g = assignedEntry(cur.id);
      assert.ok(g.gate);
      assert.deepEqual(cur.meeting, r.proposal);
      const name = ["東", "西", "南", "北"][gate],
        expected = g.choices[gate];
      const s = send("駅の" + name + "口で会いましょう", ["hint"]);
      assert.deepEqual(s.replies, [
        proposalLines(r.proposal).echo,
        expected.ack,
      ]);
      s.replies.forEach(audio);
      assert.equal(assignedAnswer(g, "東口か西口").kind, "unclear");
      assert.equal(assignedAnswer(g, "西口出会いませんか").choice, 1);
      assert.equal(
        assignedAnswer(g, "東口じゃなくて西口で会いましょう").choice,
        1,
      );
      const saved = reload().tripState(id);
      assert.match(saved.trip.outcome, new RegExp(expected.label));
      assert.match(saved.trip.stops[1].place, new RegExp(expected.label));
      assert.match(saved.trip.stops[1].setting, /明天下午4点半/);
      book.restartTrip(id);
      tomorrow();
      const [retry] = book.due();
      assert.deepEqual(retry.meeting, r.proposal);
      assert.equal(retry.choice, gate);
      assert.equal(
        assignedAnswer(
          g,
          g.answers[(gate + 1) % 4].model.jp,
          retry.choice,
          retry,
        ).kind,
        "unclear",
      );
      assert.deepEqual(
        assignedAnswer(g, expected.model.jp, retry.choice, retry).replies,
        s.replies,
      );
    }
  const { book, id, send } = visit(base, 1);
  send("今日の二時半はどうですか");
  send("明日の六時はどうですか");
  assert.match(next(book, id).lead.jp, /明日の六時/);
  send("西口でどうですか");
  assert.match(book.tripState(id).trip.stops[1].setting, /明天下午6点.*西口/);
});
