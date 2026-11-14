// Optional learner-led questions use the encounter's existing two turns.
export const speechLine = (value) => {
  const [jp, kana, zh] = value.split("|");
  return { jp, kana, zh };
};
const questions = [
  {
    ref: "f07.0",
    ending: "问店里有没有邮票",
    task: "买完明信片，你还想问店里卖不卖邮票。",
    aliases: [
      "切手はありますか",
      "切手ありますか",
      "切手を売っていますか",
      "切手もありますか",
      "切手は売っていますか",
    ],
    retry:
      "はがきを買った後、ほかに何をお探しですか。|はがきをかったあと、ほかになにをおさがしですか。|买好明信片后，您还想找什么？",
    nextRef: "f07.1",
    situation: "店员有邮票，接着和你聊起明信片。你打算寄给奶奶。",
    follow:
      "はい、切手もありますよ。そのはがきはどなたに送りますか。|はい、きってもありますよ。そのはがきはどなたにおくりますか。|有，我们也卖邮票。那张明信片是要寄给谁的？",
  },
  {
    ref: "c01.1",
    ending: "主动问店员推荐什么",
    task: "还没决定点什么，你想先听听店员的推荐。",
    aliases: [
      "ほかにおすすめはありますか",
      "他におすすめはありますか",
      "おすすめは何ですか",
      "何がおすすめですか",
      "ほかに何がおすすめですか",
      "他に何かおすすめはありますか",
      "おすすめを教えてください",
      "何かおすすめはありますか",
      "おすすめの料理はありますか",
      "ほかにおすすめはないですか",
      "他におすすめはないですか",
      "おすすめありますか",
      "他におすすめありますか",
      "おすすめのメニューは何ですか",
    ],
    retry:
      "メニューをご覧ください。注文する前に、何か聞いておきたいことはありますか。|めにゅーをごらんください。ちゅうもんするまえに、なにかきいておきたいことはありますか。|请看菜单。点单前，您想先问点什么吗？",
    nextRef: "f08.1",
    situation: "听听店员推荐的甜点。想尝尝的话，点一份。",
    follow:
      "今日のおすすめはケーキです。お一ついかがですか。|きょうのおすすめはけーきです。おひとついかがですか。|今天推荐蛋糕，来一份吗？",
  },
  null,
  {
    ref: "c03.1",
    ending: "主动问钥匙扣还有哪些颜色",
    task: "柜台旁有个蓝色钥匙扣。你想先问有没有其他颜色。",
    aliases: [
      "キーホルダーは他の色もありますか",
      "他の色はありますか",
      "別の色はありますか",
      "ほかの色もありますか",
      "ほかに色はありますか",
      "ほかの色のキーホルダーはありますか",
    ],
    retry:
      "青いキーホルダーはこちらです。色について何かご質問はありますか。|あおいきーほるだーはこちらです。いろについてなにかごしつもんはありますか。|蓝色钥匙扣在这里。关于颜色，您有什么想问的吗？",
    nextRef: "m01.0",
    situation: "工作人员拿出了红色款，你想指着这件买下它。",
    follow:
      "はい、赤もあります。青と赤、どちらになさいますか。|はい、あかもあります。あおとあか、どちらになさいますか。|有，也有红色的。蓝色和红色，您选哪个？",
  },
  {
    ref: "walk",
    ending: "主动问步行要多久",
    task: "先去邮局寄明信片。你想估一估时间，可以直接问走过去要多久。",
    aliases: [
      "歩いてどれくらいかかりますか",
      "歩いてどのくらいかかりますか",
      "歩いてどのくらいですか",
      "歩いて何分かかりますか",
      "ここから歩いて何分ですか",
      "郵便局まで歩いて何分ですか",
      "何分ぐらいかかりますか",
      "歩くと何分ですか",
      "徒歩で何分ですか",
      "何分くらいですか",
      "歩いて何分くらいですか",
      "どれくらいかかりますか",
      "歩いてどれぐらいですか",
    ],
    retry:
      "郵便局まで歩くんですね。出発する前に何を確かめたいですか。|ゆうびんきょくまであるくんですね。しゅっぱつするまえになにをたしかめたいですか。|您要走去邮局啊。出发前，想确认什么？",
    nextRef: "x04.1",
    situation: "路人会告诉你步行所需的时间和转弯处。复述转弯方向。",
    follow:
      "郵便局までは歩いて五分です。この角を左ですよ。|ゆうびんきょくまではあるいてごふんです。このかどをひだりですよ。|走到邮局要五分钟，在这个路口左转。",
  },
  {
    ref: "time",
    ending: "主动提议见面时间",
    task: "自己提一个下午见面的时间，练习里可以约十二点到六点四十五分，每隔十五分钟选一个时间。",
    retry:
      "そっちの都合に合わせたいな。何時にしようか。|そっちのつごうにあわせたいな。なんじにしようか。|我想配合你的安排。你觉得约几点好？",
  },
];
questions[2] = {
  ...questions[1],
  nextRef: "t07.1",
  situation: "听完店员推荐的主菜，如果想尝尝，就用日语点它。",
  follow:
    "それでしたら、野菜のカレーがおすすめです。カレーはいかがですか。|それでしたら、やさいのかれーがおすすめです。かれーはいかがですか。|那我推荐蔬菜咖喱，您要来一份吗？",
};
export const walkQuestion = speechLine(
  "歩いて何分ですか。|あるいてなんぷんですか。|走路要几分钟？",
);
export const proposalExample = speechLine(
  "四時半はどうですか。|よじはんはどうですか。|四点半怎么样？",
);
export function tripQuestion(week) {
  return questions[week - 1];
}

const names = [
  "十二",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
  "十",
  "十一",
];
const readings = [
  "じゅうに",
  "いち",
  "に",
  "さん",
  "よ",
  "ご",
  "ろく",
  "しち",
  "はち",
  "く",
  "じゅう",
  "じゅういち",
];
const minutes = new Map([
  ["", 0],
  ["半", 30],
  ["はん", 30],
  ["15分", 15],
  ["十五分", 15],
  ["じゅうごふん", 15],
  ["30分", 30],
  ["三十分", 30],
  ["さんじゅっぷん", 30],
  ["45分", 45],
  ["四十五分", 45],
  ["よんじゅうごふん", 45],
]);
const proposalEnding =
  /^(?:(?:は|に|で)?(?:どう(?:ですか|でしょうか|かな)?|いかが(?:ですか|でしょうか)?|大丈夫(?:ですか|です)?|空いて(?:いますか|ますか)|会(?:えますか|おう|いませんか|いましょう)|しま(?:しょうか|しょう|せんか|す)|しよう(?:か)?|お願い(?:します|できますか))|(?:が|のほうが)いい(?:です)?|(?:でも|なら)(?:いい|大丈夫)(?:ですか|です)?|にする(?:のはどう)?|で|に)?$/u;
export function readProposal(raw, edition) {
  // Canonicalize one affirmative proposal. Retain separators until clock
  // notation is read, so e.g. 16:30 is distinguishable from 16:03.
  let s = String(raw)
    .normalize("NFKC")
    .replace(/[\s、。！？!?]/gu, "")
    .split(/じゃなくて|ではなくて|じゃなく|ではなく/u)
    .at(-1)
    .replace(/^(?:じゃあ|では|それなら|えっと|ええと)/u, "")
    .replace(/どうでしょうか/gu, "どうですか")
    .replace(/だいじょうぶ/gu, "大丈夫")
    .replace(/おねがい/gu, "お願い")
    .replace(/どうですかね$/u, "どうですか");
  let day = edition === 0 ? "tomorrow" : "today";
  const dayPrefix = s.match(/^(今日|きょう|明日|あした|あす)(?:の|は|なら)?/u);
  if (dayPrefix) {
    day = ["明日", "あした", "あす"].includes(dayPrefix[1])
      ? "tomorrow"
      : "today";
    s = s.slice(dayPrefix[0].length);
  }
  s = s.replace(/^(?:午後|ごご)(?:の)?/u, "").replace(/^よんじ/u,"よじ");
  const clock = s.match(/^(\d{1,2}):(00|15|30|45)(.*)$/u);
  let hour, minute, ending;
  if (clock) {
    hour = Number(clock[1]);
    minute = Number(clock[2]);
    ending = clock[3];
  } else {
    const m = s.match(
      /^([0-9]{1,2}|[一二三四五六七八九十]+|じゅうに|じゅういち|じゅう|いち|に|さん|よ|ご|ろく|しち|はち|く)(?:時|じ)(半|はん|[0-9]{2}分|十五分|三十分|四十五分|じゅうごふん|さんじゅっぷん|よんじゅうごふん)?(.*)$/u,
    );
    if (!m) return;
    hour = /^\d+$/u.test(m[1])
      ? Number(m[1])
      : Math.max(names.indexOf(m[1]), readings.indexOf(m[1]));
    if (hour === 0 && ["十二", "じゅうに"].includes(m[1])) hour = 12;
    if (hour < 0) {
      const h = ["十三", "十四", "十五", "十六", "十七", "十八"].indexOf(m[1]);
      if (h >= 0) hour = h + 13;
    }
    minute = minutes.get(m[2] || "");
    ending = m[3];
  }
  if (hour >= 1 && hour <= 6) hour += 12;
  if (
    hour < 12 ||
    hour > 18 ||
    minute === undefined ||
    !proposalEnding.test(ending)
  )
    return;
  return { day, hour, minute };
}
export function validProposal(p) {
  return (
    !!p &&
    ["today", "tomorrow"].includes(p.day) &&
    Number.isInteger(p.hour) &&
    p.hour >= 12 &&
    p.hour <= 18 &&
    [0, 15, 30, 45].includes(p.minute)
  );
}
function clockWords(hour, minute) {
  const i = hour % 12,
    suffix = {
      0: ["", ""],
      15: ["十五分", "じゅうごふん"],
      30: ["半", "はん"],
      45: ["四十五分", "よんじゅうごふん"],
    }[minute];
  return {
    jp: names[i] + "時" + suffix[0],
    kana: readings[i] + "じ" + suffix[1],
    zh: (i || 12) + "点" + { 0: "", 15: "15分", 30: "半", 45: "45分" }[minute],
  };
}
export function proposalLines(p) {
  const t = clockWords(p.hour, p.minute),
    day =
      p.day === "today"
        ? ["今日", "きょう", "今天"]
        : ["明日", "あした", "明天"];
  const clock = day[0] + "の" + t.jp,
    reading = day[1] + "の" + t.kana,
    label = day[2] + "下午" + t.zh;
  const model = {
    jp: clock + "はどうですか。",
    kana: reading + "はどうですか。",
    zh: label + "怎么样？",
  };
  const echo = {
    jp: clock + "だね。",
    kana: reading + "だね。",
    zh: label + "对吧。",
  };
  return { label, model, echo };
}
export function timeAvailable(p, edition) {
  return p.day === "tomorrow" || (edition === 1 && p.hour >= 15);
}
export const availableReply = speechLine(
  "うん、その時間なら会えるよ。駅のどの出口にしようか。|うん、そのじかんならあえるよ。えきのどのでぐちにしようか。|好，这个时间我能到。我们在车站的哪个出口见？",
);
export const busyReply = speechLine(
  "ごめん、その時間はまだ授業なんだ。明日なら何時に会える？|ごめん、そのじかんはまだじゅぎょうなんだ。あしたならなんじにあえる？|抱歉，那个时间我还在上课。明天几点能见？",
);
export const clockSpeech = [];
for (const day of ["today", "tomorrow"])
  for (let hour = 12; hour <= 18; hour++)
    for (const minute of [0, 15, 30, 45]) {
      const { echo, model } = proposalLines({ day, hour, minute });
      clockSpeech.push(echo, model);
    }

export function questionForm(raw) {
  return String(raw)
    .replace(/お勧め|お薦め|お奨め|オススメ/gu, "おすすめ")
    .replace(/他に/gu, "ほかに")
    .replace(/何か/gu, "なにか")
    .replace(/^(?:すみません|じゃあ|では)[、, ]*/u, "");
}
