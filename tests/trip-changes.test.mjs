import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { createChapterBook } from "../chapter-talk-book.js";
import { assignedEntry, assignedAnswer } from "../trip-encounters.js";
import { changePlans } from "../trip-changes.js";
import { weeklyTrips } from "../weekly-trips.js";
import { clipStem } from "../clip-source.js";
import { proposalLines } from "../trip-questions.js";
function visit(week, edition = 0) {
  const db = new Map(),
    storage = { getItem: (k) => db.get(k), setItem: (k, v) => db.set(k, v) };
  let day = 100;
  const reload = () => createChapterBook(storage, () => day);
  const book = reload(),
    id = weeklyTrips[week - 1].chapter;
  if (edition) book.restartTrip(id);
  const state = () => reload().tripState(id);
  const next = () => state().items[0];
  const send = (raw, flags = []) => {
    const t = next(),
      entry = assignedEntry(t.id);
    for (const flag of flags) book.tripHelp(id, t.id, flag);
    if (raw == null) raw = entry.model.jp;
    const r = assignedAnswer(entry, raw, undefined, t);
    assert.equal(r.kind, "ok", t.id + " " + raw);
    book.tripAnswer(id, t.id, flags, r.choice, false, r.proposal, r.repair);
    return r;
  };
  while (next().id !== "w" + week + "." + edition) send();
  return { book, id, state, next, send, tomorrow: () => ++day };
}
test("direct curry orders in both visits can be revised; the next drink question, receipt and next-day task refer to the selected meal", () => {
  for (const v of [0, 1]) {
    const { book, id, state, next, send, tomorrow } = visit(3, v);
    send(v ? "カレーを一つください" : "カレーでお願いします");
    const key = next().id,
      change = assignedEntry(key);
    assert.equal(change.change, "curryHot");
    assert.match(change.first.jp, /少し辛い/);
    for (const bad of [
      "うどんか親子丼にします",
      "うどんにしません",
      "親子丼じゃなくてうどんにします",
      "辛いですね",
    ])
      assert.equal(assignedAnswer(change, bad).kind, "unclear", bad);
    const r = send("カレーで、あ、やっぱりうどんにします", ["unclear"]);
    assert.match(r.replies[0].jp, /カレーを取り消して、うどん/);
    assert.match(next().cue.jp, /うどん/);
    assert.match(assignedEntry(next().id).alternate.jp, /うどん/);
    send("水でお願いします");
    assert.ok(state().complete);
    assert.match(state().trip.outcome, /咖喱换成了乌冬面/);
    assert.deepEqual(book.due(), []);
    book.restartTrip(id);
    tomorrow();
    const [q] = book.due();
    assert.equal(q.choice, 1);
    assert.equal(q.variant, 1);
    assert.notEqual(change.first.jp, change.alternate.jp);
    assert.equal(
      assignedAnswer(change, "親子丼でお願いします", q.choice, q).kind,
      "unclear",
    );
    assert.equal(
      assignedAnswer(change, "やっぱりうどんにしてください", q.choice, q).kind,
      "ok",
    );
    book.settle(key, [], true, q.variant);
    assert.deepEqual(book.due(), []);
  }
});
test("an agreed exit can change independently of its time across all 16 ordered pairs and after a time conflict", () => {
  const gates = ["東口", "西口", "南口", "北口"];
  for (const v of [0, 1])
    for (const [from, old] of gates.entries())
      for (const [to, gate] of gates.entries()) {
        const { id, state, next, send, book, tomorrow } = visit(6, v);
        if (v) send("今日の二時半はどうですか");
        const when = send("明日の四時半はどうですか").proposal;
        send(old + "で会いましょう");
        const revise = assignedEntry(next().id);
        assert.equal(revise.oldExit, from);
        assert.equal(
          assignedAnswer(revise, "やっぱり東口にしよ", null, next()).choice,
          0,
        );
        assert.deepEqual(next().meeting, when);
        assert.equal(
          assignedAnswer(revise, "五時のままで東口にしよう", null, next()).kind,
          "unclear",
        );
        const r = send(
          from === to
            ? "そのままでお願いします"
            : "四時半のままで、" + old + "じゃなくて" + gate + "にしよう",
          ["hint"],
        );
        assert.deepEqual(r.replies[0], proposalLines(when).echo);
        assert.ok(r.replies[1].jp.includes(gate));
        if (from !== to)
          assert.match(r.replies[1].jp, new RegExp(old + "から" + gate));
        const trip = state().trip;
        assert.match(trip.title, new RegExp(trip.stops[1].place.slice(0, 2)));
        assert.match(trip.stops[1].setting, /明天下午4点半/);
        assert.equal(next().id, "x08.0");
        while (next()) send();
        assert.ok(state().complete);
        assert.ok(state().trip.turns.length <= 7);
        assert.equal(state().trip.title, trip.title);
        book.restartTrip(id);
        tomorrow();
        const [retry] = book.due();
        assert.equal(retry.choice, to);
        assert.deepEqual(retry.meeting, when);
        assert.equal(assignedEntry(retry.id).oldExit, from);
        assert.equal(
          assignedAnswer(
            revise,
            gates[(to + 1) % 4] + "で",
            retry.choice,
            retry,
          ).kind,
          "unclear",
        );
        assert.equal(
          assignedAnswer(revise, gate + "で", retry.choice, retry).kind,
          "ok",
        );
      }
});
test("six weekly revisions have voiced models and alternate prompts, all routes fit seven turns, declining an order creates no phantom order", () => {
  const plans = JSON.parse(
    readFileSync(new URL("../assets/timing/plans.json", import.meta.url)),
  );
  for (const c of Object.values(changePlans)) {
    assert.notEqual(c.first.jp, c.alternate.jp);
    for (const l of [
      c.first,
      c.alternate,
      ...c.options.flatMap((a) => [a.model, a.ack]),
    ]) {
      const stem = clipStem(l.jp);
      assert.ok(stem && plans[stem]?.length && l.kana && l.zh, l.jp);
      assert.ok(
        statSync(new URL("../assets/audio/" + stem + ".mp3", import.meta.url))
          .size > 500,
      );
    }
  }
  for (let week = 1; week <= 5; week++)
    for (const v of [0, 1])
      for (const final of [0, 1]) {
        const { next, state, send } = visit(week, v);
        let n = assignedEntry(next().id);
        send(n.answers[n.initiative].model.jp);
        n = assignedEntry(next().id);
        send(n.answers[n.initiative].model.jp);
        n = assignedEntry(next().id);
        send(n.answers[final].model.jp);
        if (final === 0 || [2, 5].includes(week)) {
          n = assignedEntry(next().id);
          assert.ok(n.change);
          const r = send(n.choices[1].model.kana);
          assert.ok(r.replies.length);
          assert.ok(state().trip.outcome.includes(n.choices[1].ending));
        } else
          assert.ok(
            !state().trip.turns.some((t) => assignedEntry(t.id).change),
          );
        while (next()) send();
        assert.ok(state().complete);
        assert.ok(state().trip.turns.length <= 7);
      }
});
test("skipping an exit correction keeps the original meeting but schedules a real change, and legacy completion stays closed", () => {
  const { book, state, next, send, id, tomorrow } = visit(6);
  send("明日の四時半はどうですか");
  send("西口で");
  const key = next().id;
  book.tripHelp(id, key, "skip");
  book.tripAnswer(id, key, ["skip"], 1, true);
  assert.equal(state().trip.stops[1].place, "西口服务台");
  tomorrow();
  assert.equal(book.due()[0].choice, 0);
  while (next()) send();
  const d = book.checkpoint("week:" + id);
  const { allowChanges, ...old } = d;
  delete old.answers[key];
  delete old.choices[key];
  delete old.skipped[key];
  old.allowChanges = undefined;
  book.patch("week:" + id, old);
  assert.ok(state().complete);
  assert.equal(state().trip.turns.length, 5);
  book.restartTrip(id);
  assert.ok(state().trip.allowChanges);
});

test("one-breath corrections commit old and new only once, before the next prompt or meal receipt", () => {
  for (const mode of [
    "direct",
    "direct-after-menu",
    "recommend",
    "ask-heat",
    "meeting",
  ]) {
    const { next, state, send } = visit(mode === "meeting" ? 6 : 3);
    if (mode === "meeting") send("明日の四時半はどうですか");
    if (mode === "direct-after-menu") send("魚の定食はありますか");
    if (["recommend", "ask-heat"].includes(mode)) send("おすすめはありますか");
    if (mode === "ask-heat") send("辛いですか");
    const meeting = mode === "meeting",
      r = send(
        meeting
          ? "西口で、あ、やっぱり東口にしよう"
          : "カレーじゃなくて、うどんにしてください",
      );
    assert.ok(r.repair, mode);
    assert.match(
      r.replies.at(-1).jp,
      meeting ? /西口から東口/ : /カレーを取り消して、うどん/,
    );
    assert.ok(
      state().records.some(
        (t) => t.id === r.repair.id && t.choice === r.repair.choice,
      ),
      mode,
    );
    if (meeting) {
      assert.equal(next().id, "x08.0");
      assert.match(state().trip.stops[1].setting, /4点半.*东口/);
    } else if (mode === "direct") {
      assert.match(next().cue.jp, /うどん/);
    } else {
      assert.ok(state().complete, mode);
    }
  }
});

test("a corrected utterance that needed help comes back as the final requested change", () => {
  const { book, send, tomorrow } = visit(6);
  send("明日の四時半はどうですか");
  send("西口じゃなくて東口で会いましょう", ["hint"]);
  tomorrow();
  const due = book.due();
  assert.equal(due.length, 1);
  assert.deepEqual(
    [due[0].id, due[0].choice, due[0].meeting.hour],
    ["w6.change.exit1", 0, 16],
  );
});
