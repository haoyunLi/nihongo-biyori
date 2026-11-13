import { clipStem } from "./clip-source.js?v=12";
import { makeGroups, moraLabels } from "./mora-groups.js";

export const rhythmTypes = {
  closure: {
    name: "促音",
    pair: "kitte",
    tip: "点到「っ」先稳住下一个辅音，下一拍再放开。",
    words: [
      { jp: "一杯", kana: "いっぱい", zh: "点饮料时说的一杯", first: 1 },
      {
        jp: "切手",
        kana: "きって",
        audio: "きって",
        zh: "在邮局买的邮票",
        first: 1,
      },
    ],
  },
  vowel: {
    name: "长音",
    pair: "biru",
    tip: "让同一个元音连着响过两拍，中间保持连贯。",
    words: [
      { jp: "ケーキ", kana: "ケーキ", zh: "咖啡店里的蛋糕", first: 0 },
      { jp: "ビール", kana: "ビール", zh: "餐厅菜单上的啤酒", first: 0 },
    ],
  },
  nasal: {
    name: "拨音",
    pair: "kinen",
    tip: "给「ん」单独留一拍，再接下一个音。",
    words: [
      { jp: "温泉", kana: "おんせん", zh: "旅行时去泡的温泉", first: 1 },
      {
        jp: "本屋",
        kana: "ほんや",
        audio: "ほんや",
        zh: "卖漫画和书的书店",
        first: 1,
      },
    ],
  },
};

let catalog;
export async function reviewableBeats(target) {
  const stem = clipStem(
    target.audio,
    target.reading,
    target.voice === "learner",
  );
  if (!stem) return [];
  catalog ??= fetch(new URL("./assets/timing/plans.json?v=12", import.meta.url))
    .then((r) => {
      if (!r.ok) throw new Error("plans");
      return r.json();
    })
    .catch((e) => {
      catalog = null;
      throw e;
    });
  const plan = (await catalog)[stem];
  if (!plan) return [];
  const groups = makeGroups(plan, target.reading || target.reference).filter(
    (g) => !g.pause,
  );
  const kana = groups.flatMap((g) => g.labels).join("");
  return groups.flatMap((g) => {
    const type = g.phones.includes("q")
      ? "closure"
      : g.phones.includes("N")
        ? "nasal"
        : g.labels.length > 1
          ? "vowel"
          : null;
    return type
      ? [
          {
            type,
            first: g.first,
            count: g.labels.length,
            jp: target.reference,
            kana,
            audio: target.audio,
            zh: target.zh || "",
            learner: target.voice === "learner",
          },
        ]
      : [];
  });
}
export function rhythmCard(entry) {
  if (!entry || !Object.hasOwn(rhythmTypes, entry.type)) return null;
  const { jp, kana, audio, zh, learner, first, count, type } = entry;
  if (
    ![jp, kana, audio, zh].every(
      (s) => typeof s === "string" && s.length <= 220,
    ) ||
    !jp ||
    !kana ||
    typeof learner !== "boolean"
  )
    return null;
  const stem = clipStem(audio, kana, learner),
    beats = moraLabels(kana);
  if (
    !stem ||
    !Number.isInteger(first) ||
    first < 0 ||
    !Number.isInteger(count) ||
    count < 1 ||
    first + count > beats.length
  )
    return null;
  const config = rhythmTypes[type],
    id = `rhythm:${stem}:${first}:${type}`;
  const normalize = (s) =>
    s.replace(/[ァ-ヶ]/gu, (c) => String.fromCodePoint(c.codePointAt(0) - 96));
  const transfer = config.words.find(
    (word) =>
      normalize(word.kana) !== normalize(kana) &&
      clipStem(word.audio || word.jp, word.kana) !== stem,
  );
  if (!transfer) return null;
  return {
    id,
    kind: "rhythm",
    signature: id,
    item: { jp, kana, audio, zh, learner, first, count },
    transfer: { ...transfer, count: type === "vowel" ? 2 : 1 },
    type,
    label: config.name + "隔天跟读",
    source: "#practice/sounds/" + config.pair,
  };
}
