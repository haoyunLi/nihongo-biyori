import test from "node:test";
import assert from "node:assert/strict";
import { statSync } from "node:fs";
import {
  interpret,
  makeRun,
  finishTurn,
  needsPractice,
} from "../talk-engine.js";
import { talks, talkSpeech } from "../talk-data.js";
import { clipStem } from "../clip-source.js";
test("all scenarios lead to a finish from every reachable prompt and every model reply means what the partner thinks", () => {
  for (const [id, s] of Object.entries(talks)) {
    const seen = new Set(),
      queue = [s.start];
    let endings = 0;
    while (queue.length) {
      const key = queue.pop();
      if (seen.has(key)) continue;
      seen.add(key);
      const node = s.nodes[key];
      assert.ok(node?.edges.length);
      for (const e of node.edges) {
        assert.equal(
          interpret(id, key, e.model.jp).next,
          e.next,
          id + "/" + key + ":" + e.model.jp,
        );
        if (e.next) queue.push(e.next);
        else endings++;
      }
    }
    assert.equal(seen.size, Object.keys(s.nodes).length);
    assert.ok(endings > 0);
    const finishable = new Set([null]);
    for (let i = 0; i <= seen.size; i++)
      for (const key of seen)
        if (s.nodes[key].edges.some((e) => finishable.has(e.next)))
          finishable.add(key);
    assert.equal(finishable.size, seen.size + 1);
  }
  for (const line of talkSpeech) {
    const stem = clipStem(line.jp);
    assert.ok(
      stem &&
        statSync(new URL("../assets/audio/" + stem + ".mp3", import.meta.url))
          .size > 1000,
      line.jp,
    );
  }
});
test("Japanese quantities, follow-up questions, self-corrections, negation and register affect the path", () => {
  const cases = [
    ["restaurant", "place", "ここで食べます", "party"],
    ["restaurant", "place", "テイクアウトで", "menu"],
    ["restaurant", "place", "いいえ", "takeCheck"],
    ["restaurant", "menu", "すみません、カレーを二つお願いします", "drink"],
    ["restaurant", "menu", "うどんください", "quantity"],
    ["restaurant", "menu", "魚の定食を一つ", "sold"],
    ["restaurant", "sold", "じゃあ、うどん二人前で", "drink"],
    ["restaurant", "drink", "アイスコーヒーをください", "bill"],
    ["restaurant", "drink", "コーヒーください", "temp"],
    ["restaurant", "drink", "いいえ、いりません", "bill"],
    ["restaurant", "pay", "カードは使えますか", "payConfirm"],
    ["restaurant", "pay", "カードじゃなくて現金でお願いします", "receipt"],
    ["restaurant", "receipt", "レシートはいりません", null],
    ["station", "destination", "大阪まで", "osaka"],
    ["friends", "invite", "明日なら行けます", "time"],
    ["friends", "invite", "今日はちょっと、また今度", null],
    ["friends", "hobby", "まんがが好きです", "manga"],
  ];
  for (const [s, n, t, next] of cases) {
    const outcome = interpret(s, n, t);
    assert.equal(outcome.kind, "ok", t);
    assert.equal(outcome.next, next, t);
  }
  for (const [s, n, t] of [
    ["restaurant", "menu", "カレーじゃないです"],
    ["restaurant", "menu", "カレーとうどん"],
    ["restaurant", "receipt", "うどんをください"],
    ["restaurant", "pay", "京都です"],
    ["friends", "hobby", "ゲームは好きじゃないです"],
    ["station", "confirm", "二番線ですね"],
  ]) {
    assert.equal(interpret(s, n, t).kind, "unclear", t);
  }
  assert.equal(
    interpret("restaurant", "pay", "もう一度お願いします").kind,
    "repeat",
  );
  assert.equal(
    interpret("restaurant", "menu", "カレーを２つください").replies.at(-1).jp,
    "二つですね。",
  );
});
test("targeted retry asks the actual missed prompt and doesn't follow fresh branches or re-ask clean turns", () => {
  const run = makeRun("restaurant");
  run.support.add("hint");
  finishTurn(run, interpret("restaurant", "place", "テイクアウトで"), {});
  finishTurn(run, interpret("restaurant", "menu", "カレーを二つ"), {});
  run.support.add("unclear");
  finishTurn(run, interpret("restaurant", "drink", "コーヒー"), {});
  const items = needsPractice(run.records);
  assert.deepEqual(
    items.map((i) => i.id),
    ["place", "drink"],
  );
  const retry = makeRun("restaurant", items);
  finishTurn(retry, interpret("restaurant", "place", "店内で"), {});
  assert.equal(retry.node, "drink");
  finishTurn(retry, interpret("restaurant", "drink", "コーヒー"), {});
  assert.ok(retry.done);
  assert.deepEqual(needsPractice(retry.records), []);
});
