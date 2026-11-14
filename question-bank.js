import {encounterSpeech} from "./trip-encounters.js?v=18";
import {weeklyTrips} from "./weekly-trips.js";
import {chapterSpeech} from "./chapter-talk-data.js";
import { talkSpeech } from "./talk-data.js?v=13";
import {
  counterSpeech,
  finalCues,
  finalQuizCue,
  mixed,
  guided,
  families,
} from "./counter-data.js";
import { lessons } from "./lessons.js?v=18";
import { station, animeScenes } from "./activity-data.js";
import { contrasts } from "./contrast-data.js";
import { scenes } from "./scenes.js";
import { kanaGuides } from "./kana-guides.js";

export const questions = new Map();
// Spoken answer and teaching step for the original 21 lessons. IDs are stable
// across the daily route reordering and older wrong-answer books.
const spoken = {
  f01: [
    ["あお", 3],
    ["え", 2],
  ],
  f02: [
    ["すし", 1],
    ["かさ", 0],
  ],
  f03: [
    ["つき", 0],
    ["ちか", 0],
  ],
  f04: [
    ["ふね", 0],
    ["みみ", 1],
  ],
  f05: [
    ["ほんや", 2],
    ["やき", 0],
  ],
  f06: [
    ["かぎ", 0],
    ["ぱ", 2],
  ],
  f07: [
    ["きって", 1],
    ["きょう", 0],
  ],
  f08: [
    ["コーヒー", 0],
    ["ホテル", 0],
  ],
  f09: [
    ["学生ですか。", 1],
    ["私も学生です。", 2],
  ],
  f10: [
    ["ホテルへ行きます。", 1],
    ["店でコーヒーを買います。", 2],
  ],
  t01: [
    ["左です。", 1],
    ["もう一度お願いします。", 2],
  ],
  t02: [
    ["三番線です。", 1],
    ["この電車は京都に行きますか。", 2],
  ],
  t03: [
    ["パスポートをお願いします。", 1],
    ["チェックアウトは何時ですか。", 2],
  ],
  t04: [
    ["これを二つください。", 0],
    ["持ち帰りでお願いします。", 2],
  ],
  t05: [
    ["三百円です。", 1],
    ["現金だけです。", 2],
  ],
  t06: [
    ["青いかばんです。", 2],
    ["財布を忘れました。", 0],
  ],
  c01: [
    ["冒険のアニメが好きです。", 1],
    ["おすすめはありますか。", 2],
  ],
  c02: [
    ["売り切れです。", 2],
    ["二枚ください。", 1],
  ],
  c03: [
    ["赤ならあります。", 1],
    ["そのキーホルダーをください。", 2],
  ],
  c04: [
    ["わかりました。", 2],
    ["ここで写真を撮ってもいいですか。", 0],
  ],
  c05: [
    ["待て！", 2],
    ["すみません、少し待ってください。", 1],
    ["明日の分はありますか。", 3],
  ],
};
export const additionalSpeech = [
  ...weeklyTrips.flatMap(t => t.turns.map(v => v.cue)),
  ...encounterSpeech,
  ...chapterSpeech,
  ...talkSpeech,
  ...counterSpeech,
  ...finalCues,
  finalQuizCue,
  {
    jp: "予約しました。リンです。",
    kana: "よやくしました。りんです。",
    zh: "我订过房。我姓林。",
  },
  { jp: "かさ", kana: "かさ", spoken: "傘", zh: "伞" },
  { jp: "やき", kana: "やき", spoken: "焼き", zh: "练习音节 ya・ki" },
  { jp: "ぱ", kana: "ぱ", zh: "pa" },
  { jp: "え", kana: "え", zh: "e" },
  {
    jp: "店でコーヒーを買います。",
    kana: "みせでこーひーをかいます。",
    zh: "在店里买咖啡。",
  },
  { jp: "学生ですか。", kana: "がくせいですか。", zh: "你是学生吗？" },
];
const allExamples = lessons.flatMap((l) => [
  ...l.steps.flatMap((s) => s.examples),
  ...l.dialogue,
]);
for (const l of lessons) {
  const examples = [
    ...l.steps.flatMap((s) => s.examples),
    ...l.dialogue,
    ...additionalSpeech,
  ];
  l.quiz.forEach((q, i) => {
    const [jp, step] = q.model ? [q.model.jp, q.step] : spoken[l.id][i];
    const model =
      q.model ||
      examples.find((v) => v.jp === jp) ||
      allExamples.find((v) => v.jp === jp);
    if (!model) throw new Error("Missing spoken correction " + l.id + ":" + i);
    questions.set(l.id + ":" + i, {
      ...q,
      model,
      source: "#lesson/" + l.id + "/" + step,
      lesson: l.id,
      label: l.title,
      category:
        q.category ||
        (q.listen
          ? "听辨理解"
          : l.id.startsWith("f")
            ? "读音与句型"
            : "场景接话"),
    });
  });
}
function add(
  key,
  prompt,
  options,
  answer,
  why,
  model,
  source,
  label,
  category,
  listen,
) {
  questions.set(key, {
    prompt,
    options,
    answer,
    why,
    model,
    source,
    label,
    category,
    listen,
    learner: model.learner,
  });
}
for (const q of [...guided, ...mixed]) {
  const f = families[q.family];
  add(
    "counter:" + q.id,
    q.goal + " 听店员说完，哪句能接上？",
    q.options,
    q.answer,
    q.cue.jp +
      "（" +
      q.cue.kana +
      "）意思是“" +
      q.cue.zh +
      "”。留意「" +
      q.cue.clue +
      "」。" +
      f.clue,
    q.model,
    "#practice/counter/" + q.family,
    "柜台换问法 · " + f.name,
    "柜台接话",
    q.cue.jp,
  );
}
station.platforms.forEach((m, i) =>
  add(
    "platform:" + i,
    "听站员回答，走哪个入口？",
    ["一号站台", "二号站台", "三号站台"],
    i,
    "先抓数字，再听ばんせん。把听到的号码复述一遍。",
    m,
    "#practice/platform",
    "听回答，去站台",
    "听数字",
    m.jp,
  ),
);
animeScenes.forEach((s, i) =>
  add(
    "anime:" + i,
    s.question,
    s.options,
    s.answer,
    s.tip,
    s.lines[1],
    "#practice/anime",
    s.title,
    "听懂口语",
    s.lines[1].jp,
  ),
);
for (const pair of contrasts)
  pair.items.forEach((w, i) =>
    add(
      "contrast:" + pair.id + ":" + i,
      "听示范，选择读音和意思。",
      pair.items.map((v) => v.jp + " · " + v.zh),
      i,
      pair.cue + " " + pair.self,
      { ...w, kana: w.beats.join("") },
      "#practice/sounds/" + pair.id,
      pair.title,
      "相近音",
      w.audio,
    ),
  );
for (const scene of scenes) {
  const lesson = lessons.find((l) => l.id === scene.id);
  const lines = [
    ...lesson.steps.flatMap((s) => s.examples),
    ...lesson.dialogue,
  ];
  scene.turns.forEach((t, i) =>
    t.choices.forEach((c, j) => {
      const model = lines.find((x) => x.jp === c.line);
      const foils = lines.map((x) => x.jp).filter((x) => x !== c.line);
      const options = [...new Set(foils)].slice(0, 2);
      const answer = (i + j) % 3;
      options.splice(answer, 0, c.line);
      add(
        "scene:" + scene.id + ":" + i + ":" + j,
        c.goal,
        options,
        answer,
        c.hint,
        model,
        "#practice/scene/" + scene.id,
        scene.title,
        "语块接话",
      );
    }),
  );
}
for (const g of kanaGuides) {
  for (const [isKana, items] of [
    [true, g.items],
    [false, g.words],
  ]) {
    for (const [i, v] of items.entries()) {
      const model = isKana
        ? { jp: v.hira, kana: v.hira, zh: v.romaji }
        : { ...v, kana: v.beats.join("") };
      const answer = isKana ? v.hira : v.zh;
      const alternatives = [
        ...items,
        ...(isKana ? kanaGuides[0].items : kanaGuides[0].words),
      ].map((x) => (isKana ? x.hira : x.zh));
      const opts = [...new Set(alternatives)]
        .filter((x) => x !== answer)
        .slice(0, 2);
      const pos = i % (opts.length + 1);
      opts.splice(pos, 0, answer);
      add(
        isKana ? "kana:" + v.hira : "word:" + g.id + ":" + v.jp,
        isKana ? "听音，选出对应假名。" : "听词，选出它的意思。",
        opts,
        pos,
        isKana
          ? "这拍是 " +
              v.romaji +
              "，平假名 " +
              v.hira +
              "，片假名 " +
              v.kata +
              "。"
          : v.scene,
        model,
        "#kana/" + g.id + "/check",
        g.title,
        isKana ? "假名辨音" : "情景词义",
        model.jp,
      );
    }
  }
}
