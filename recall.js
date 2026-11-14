import { questions } from "./question-bank.js?v=16";
import { rhythmCard } from "./rhythm-review.js?v=16";
import { contrasts } from "./contrast-data.js";
import { kanaGuides } from "./kana-guides.js";
import { lessons } from "./lessons.js?v=16";

const gaps = [1, 3, 7, 14, 30];
export const dailyLimit = 5;
export const recallCards = new Map();
const byLesson = new Map();
const byRow = new Map();
const foundationRows = {
  f01: ["a"],
  f02: ["ka", "sa"],
  f03: ["ta", "na"],
  f04: ["ha", "ma"],
  f05: ["ya", "ra", "wa", "n"],
  f06: ["ga", "za", "da", "ba", "pa"],
};

function register(card) {
  recallCards.set(card.id, card);
  return card.id;
}

for (const pair of contrasts) {
  pair.items.forEach((v, i) =>
    register({
      id: "contrast:" + pair.id + ":" + i,
      kind: "mistake",
      pair: true,
      label: pair.title,
      source: "#practice/sounds/" + pair.id,
      signature: "contrast:" + pair.id + ":" + i,
      q: {
        prompt: "听两种读法，这段示范对应哪一个？",
        listen: v.audio,
        options: pair.items.map((w) => w.jp + " · " + w.zh),
        answer: i,
        why: v.beats.join("・") + "，共 " + v.beats.length + " 拍。" + pair.cue,
      },
    }),
  );
}
for (const group of kanaGuides) {
  for (const word of group.words)
    register({
      id: "word:" + group.id + ":" + word.jp,
      kind: "word",
      item: { ...word, kana: word.beats.join("") },
      label: group.title + "情景词",
      source: "#kana/" + group.id + "/words",
      signature: "word:" + word.jp,
    });
  byRow.set(
    group.id,
    group.items.map((item) =>
      register({
        id: "kana:" + item.hira,
        kind: "kana",
        item,
        label: group.title,
        source: "#kana/" + group.id,
        signature: "kana:" + item.hira,
      }),
    ),
  );
}
for (const lesson of lessons) {
  const studied = [];
  function expression(item, key, step) {
    const id = register({
      id: "say:" + key,
      kind: "say",
      item,
      label: lesson.title,
      signature: "say:" + item.jp,
      source: "#lesson/" + lesson.id + "/" + step,
    });
    return id;
  }
  lesson.steps.forEach((step, i) =>
    step.examples.forEach((item, j) => {
      const id = expression(item, lesson.id + ".s" + i + "." + j, i);
      // One expression per step keeps a completed lesson manageable.
      if (j === 0) studied.push(id);
    }),
  );
  lesson.dialogue.forEach((item, j) =>
    expression(item, lesson.id + ".d" + j, lesson.steps.length),
  );
  byLesson.set(lesson.id, studied);
}
for (const [key, q] of questions) {
  // Kana, word and contrast cards already have their own recall modes.
  if (recallCards.has(key)) continue;
  register({
    id: "mistake:" + key,
    kind: "mistake",
    q,
    label: q.label,
    source: q.source,
    signature: "quiz:" + key,
  });
}

export function localDay(date = new Date()) {
  return (
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000
  );
}
export function dayLabel(day) {
  const date = new Date(day * 86400000);
  return `${date.getUTCMonth() + 1} 月 ${date.getUTCDate()} 日`;
}

function tieBreak(id, day) {
  let h = 2166136261;
  for (const c of String(day) + id)
    h = Math.imul(h ^ c.codePointAt(0), 16777619);
  return h >>> 0;
}

function eligible(state, history) {
  const rows = new Set(state.kanaDone);
  for (const id of state.done)
    for (const row of foundationRows[id] || []) rows.add(row);
  const lists = [
    state.mistakes.map((k) => (recallCards.has(k) ? k : "mistake:" + k)),
    state.saved.map((k) => "say:" + k),
    [...rows].flatMap((k) => byRow.get(k) || []),
    state.done.flatMap((k) => byLesson.get(k) || []),
  ].map((list) => list.filter((id) => recallCards.has(id)));
  const learningSounds = Object.keys(history).filter((id) => {
    const kind = recallCards.get(id)?.kind;
    return (
      kind === "kana" ||
      kind === "word" ||
      kind === "rhythm" ||
      recallCards.get(id)?.pair
    );
  });
  const vowels = byRow.get("a");
  const warmup =
    lists.every((list) => !list.length) &&
    learningSounds.every((id) => vowels.includes(id));
  lists[2] = [...new Set([...(warmup ? vowels : lists[2]), ...learningSounds])];
  return { lists, warmup };
}

export function planDay(state, history, day) {
  const { lists, warmup } = eligible(state, history);
  const all = [...new Set(lists.flat())];
  const due = all
    .filter((id) => history[id] && history[id].due <= day)
    .sort(
      (a, b) =>
        Number(recallCards.get(b).kind === "rhythm") -
          Number(recallCards.get(a).kind === "rhythm") ||
        history[a].due - history[b].due ||
        tieBreak(a, day) - tieBreak(b, day),
    );
  const fresh = lists.map((items) =>
    items
      .filter((id) => !history[id])
      .sort((a, b) => tieBreak(a, day) - tieBreak(b, day)),
  );
  const candidates = [...due];
  for (let i = 0; fresh.some((list) => i < list.length); i++) {
    for (const list of fresh) if (i < list.length) candidates.push(list[i]);
  }
  const signatures = new Set();
  const ids = [];
  for (const id of candidates) {
    const signature = recallCards.get(id).signature;
    if (signatures.has(signature)) continue;
    signatures.add(signature);
    ids.push(id);
    if (ids.length === dailyLimit) break;
  }
  const future = all.map((id) => history[id]?.due).filter((d) => d > day);
  return { ids, warmup, nextDue: future.length ? Math.min(...future) : null };
}

export function newRound(day, plan) {
  return { day, ids: plan.ids, warmup: plan.warmup, first: {}, retry: {} };
}

export function pendingCard(round) {
  if (!round) return null;
  for (const id of round.ids)
    if (!Object.hasOwn(round.first, id)) return { id, phase: "first" };
  for (const id of round.ids)
    if (round.first[id] === "again" && !Object.hasOwn(round.retry, id))
      return { id, phase: "retry" };
  return null;
}

export function recordRating(book, day, id, phase, ok) {
  const pending = pendingCard(book.round);
  if (
    !pending ||
    book.round.day !== day ||
    pending.id !== id ||
    pending.phase !== phase
  )
    return false;
  book.round[phase][id] = ok ? "ok" : "again";
  if (phase === "first") {
    const level = ok
      ? Math.min((book.history[id]?.level || 0) + 1, gaps.length)
      : 0;
    book.history[id] = {
      ...(book.history[id]?.rhythm ? { rhythm: book.history[id].rhythm } : {}),
      level,
      due: day + (ok ? gaps[level - 1] : 1),
    };
  }
  return true;
}

export function scheduleRhythm(book, entry, day) {
  const card = rhythmCard(entry);
  if (!card) return false;
  register(card);
  if (book.history[card.id]?.due === day + 1) return false;
  book.history[card.id] = { rhythm: entry, level: 0, due: day + 1 };
  return true;
}

export function scheduleMistake(book, key, day) {
  const id = recallCards.has(key) ? key : "mistake:" + key;
  if (!recallCards.has(id)) return false;
  if (book.history[id]?.level === 0 && book.history[id].due === day + 1)
    return false;
  book.history[id] = { level: 0, due: day + 1 };
  return true;
}

export function flagListeningMiss(book, id, day) {
  if (!recallCards.has(id)) return false;
  const reviewed =
    book.round?.day === day && Object.hasOwn(book.round.first, id);
  const due = day + (reviewed ? 1 : 0);
  const prior = book.history[id];
  if (prior?.ear && prior.level === 0 && prior.due === due) return false;
  book.history[id] = { level: 0, due, ear: true };
  return true;
}

const aliases = {
  し: ["si"],
  ち: ["ti"],
  つ: ["tu"],
  ふ: ["hu"],
  を: ["wo"],
  ん: ["nn", "n'"],
  じ: ["zi"],
  ぢ: ["di", "dji"],
  づ: ["du", "dzu"],
  しゃ: ["sya"],
  しゅ: ["syu"],
  しょ: ["syo"],
  ちゃ: ["tya", "cya"],
  ちゅ: ["tyu", "cyu"],
  ちょ: ["tyo", "cyo"],
  じゃ: ["zya", "jya"],
  じゅ: ["zyu", "jyu"],
  じょ: ["zyo", "jyo"],
};
const sameSounds = {
  お: "を",
  を: "お",
  じ: "ぢ",
  ぢ: "じ",
  ず: "づ",
  づ: "ず",
};
export function matchesRomaji(item, value, listening = false) {
  const answer = value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replaceAll("’", "'");
  const alternate = listening && sameSounds[item.hira];
  const accepted = [item.romaji, ...(aliases[item.hira] || [])];
  if (alternate) accepted.push(...(aliases[alternate] || []));
  return accepted.includes(answer);
}

const storageKey = "nihongo-biyori-daily-v1";
let memoryBook = { history: {}, round: null };
let memoryOnly = false;
export function readBook() {
  if (memoryOnly) return memoryBook;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { history: {}, round: null };
    const saved = JSON.parse(raw);
    const history = {};
    for (const [id, r] of Object.entries(saved?.history || {})) {
      if (id.startsWith("rhythm:")) {
        const card = rhythmCard(r?.rhythm);
        if (card?.id !== id) continue;
        register(card);
      }
      if (
        recallCards.has(id) &&
        Number.isInteger(r?.due) &&
        Number.isInteger(r?.level) &&
        r.level >= 0 &&
        r.level <= gaps.length
      )
        history[id] = r;
    }
    const r = saved?.round;
    let round = null;
    if (Number.isInteger(r?.day) && Array.isArray(r.ids)) {
      const ids = [...new Set(r.ids.filter((id) => recallCards.has(id)))].slice(
        0,
        dailyLimit,
      );
      round = {
        day: r.day,
        ids,
        warmup: r.warmup === true,
        first: {},
        retry: {},
      };
      for (const id of ids) {
        if (history[id] && ["ok", "again"].includes(r.first?.[id]))
          round.first[id] = r.first[id];
        if (
          round.first[id] === "again" &&
          ["ok", "again"].includes(r.retry?.[id])
        )
          round.retry[id] = r.retry[id];
      }
    }
    memoryBook = { history, round };
    return memoryBook;
  } catch {
    return memoryBook;
  }
}
export async function updateBook(change, onStorageFailure) {
  function commit() {
    const book = readBook();
    if (!change(book)) return false;
    memoryBook = book;
    try {
      localStorage.setItem(storageKey, JSON.stringify(book));
    } catch {
      memoryOnly = true;
      onStorageFailure();
    }
    return true;
  }
  return navigator.locks
    ? navigator.locks.request(storageKey, commit)
    : commit();
}
