import { talks, numberEdges } from "./talk-data.js";

export function normalise(text) {
  return String(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/gu, (c) => String.fromCharCode(c.charCodeAt(0) - 96))
    .replace(/[\s\p{P}\p{S}]/gu, "");
}
const repeat =
  /もう(一|1|いち)度|もういちど|もう一回|もう1回|もういっかい|分かりません|わかりません|聞き取れ|ききとれ|ゆっくり|もう一遍/u;
const negative =
  /以外|いがい|じゃな|ではな|じゃあり|ではあり|じゃなく|じゃない|いらな|いりません|要りません|行けません|いけません|たくな|好きでは|好きじゃ|ちがい|違い|無理|むり|苦手|にがて|嫌い|きらい|ません|なしで|ないです|れない/u;
const ask = /ですか|ますか|でしょうか|いいんですか/u;
export function interpret(scene, id, raw) {
  const n = talks[scene].nodes[id],
    t = normalise(raw);
  if (!t) return { kind: "empty" };
  if (repeat.test(t)) return { kind: "repeat" };
  // Keep the corrected part of a Japanese self-correction, if present.
  const target = t
    .split(
      /じゃなくて|ではなくて|じゃなく|ではなく|じゃないです[、,]?やっぱり/u,
    )
    .at(-1);
  let edges = n.edges.filter((e) => e.match.test(target));
  const neg = negative.test(target.replace(/^すみません/u, "")),
    question = ask.test(target);
  // A polite apology can lead an otherwise affirmative order.
  if (
    /^(?:はい|ええ|いいえ|いえ)?(?:一人|1人|ひとり|二人|2人|ふたり|三人|3人|さんにん)(?:です|でお願いします|でおねがいします)?$/u.test(
      target,
    ) &&
    scene === "restaurant" &&
    id === "place"
  ) {
    return {
      kind: "clarify",
      message: "对方刚问的是在哪里吃。等对方问人数时再报人数。",
    };
  }
  if (question) edges = edges.filter((e) => e.question);
  else if (
    edges.some((e) => e.question) &&
    edges.some((e) => !e.question) &&
    !neg
  )
    edges = edges.filter((e) => !e.question);
  if (neg) edges = edges.filter((e) => e.negative);
  if (edges.some((e) => e.prefer)) edges = edges.filter((e) => e.prefer);
  if (
    edges.length > 1 &&
    edges.every(
      (e) => e.next === edges[0].next && e.model.jp === edges[0].model.jp,
    )
  )
    edges = edges.slice(0, 1);
  if (edges.length !== 1) return { kind: "unclear" };
  const e = edges[0];
  let next = e.next;
  const replies = e.ack ? [e.ack] : [];
  if (e.food) {
    const counts = numberEdges.filter((i) => i.match.test(target));
    if (counts.length > 1) return { kind: "unclear" };
    if (counts.length) {
      next = "drink";
      replies.push(counts[0].ack);
    }
  }
  if (e.temperature) {
    const temps = talks.restaurant.nodes.temp.edges.filter((i) =>
      i.match.test(target),
    );
    if (temps.length > 1) return { kind: "unclear" };
    if (temps.length) next = "bill";
  }
  return { kind: "ok", next, replies, model: e.model.jp };
}
export function makeRun(scene, items = null) {
  return {
    scene,
    node: items ? items[0].id : talks[scene].start,
    items,
    index: 0,
    records: [],
    support: new Set(),
    done: false,
  };
}
export function finishTurn(run, result, extra) {
  const record = { id: run.node, flags: [...run.support], ...extra };
  run.records.push(record);
  run.index++;
  run.node = run.items ? (run.items[run.index]?.id ?? null) : result.next;
  run.support = new Set();
  run.done = run.node === null;
  return record;
}
export function needsPractice(records) {
  return records.filter((r) => r.flags.length);
}
