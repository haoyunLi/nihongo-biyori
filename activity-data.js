const line = (jp, kana, zh, learner = false) => ({ jp, kana, zh, learner });
export const station = {
  question: line(
    "京都行きは何番線ですか。",
    "きょうとゆきはなんばんせんですか。",
    "去京都的车在几号站台？",
  ),
  repeat: line(
    "もう一度お願いします。",
    "もういちどおねがいします。",
    "请再说一遍。",
  ),
  platforms: [
    line("一番線です。", "いちばんせんです。", "在一号站台。"),
    line("二番線です。", "にばんせんです。", "在二号站台。"),
    line("三番線です。", "さんばんせんです。", "在三号站台。"),
  ],
};
export const animeScenes = [
  {
    title: "出发去看首映",
    setting: "你们约好一起看首映。出门前，两位朋友通了电话。",
    question: "接电话的朋友在哪儿，在做什么？",
    options: ["在车站等人", "正在往车站走", "在影院门口等人"],
    answer: 0,
    lines: [
      line("今、どこ？", "いま、どこ？", "你现在在哪儿？", true),
      line("駅で待ってるよ。", "えきでまってるよ。", "我在车站等你哦。"),
    ],
    chunks: [
      line("駅で", "えきで", "在车站。で标出动作发生的地方。"),
      line("待ってるよ", "まってるよ", "我正等着呢。よ在这里把消息告诉对方。"),
    ],
    full: line("待っている", "まっている", "正在等"),
    casual: line("待ってる", "まってる", "正在等，朋友间的口语"),
    tip: "「待っている」里的「い」在口语里省掉了。前面的「っ」还在，读「ま・っ・て・る」时仍要留出这一拍。",
  },
  {
    title: "活动开始前",
    setting: "动漫活动还没开场。一位朋友正盯着手机屏幕。",
    question: "朋友正在手机上看什么？",
    options: ["活动地图", "预告片", "演出时间表"],
    answer: 1,
    lines: [
      line("何見てるの？", "なにみてるの？", "在看什么呢？", true),
      line("予告を見てるよ。", "よこくをみてるよ。", "我在看预告片。"),
    ],
    chunks: [
      line("予告を", "よこくを", "预告片。を标出看的对象。"),
      line("見てるよ", "みてるよ", "我正看着呢。"),
    ],
    full: line("見ている", "みている", "正在看"),
    casual: line("見てる", "みてる", "正在看，朋友间的口语"),
    tip: "同样的缩略也出现在问句里。「何見てるの？」的「見てる」就是「見ている」，这里问的是眼下正在做什么。",
  },
];
export const activitySpeech = [
  { jp: "一杯" },
  { jp: "温泉" },
  station.question,
  station.repeat,
  ...station.platforms,
  ...animeScenes.flatMap((s) => [...s.lines, ...s.chunks, s.full, s.casual]),
];
