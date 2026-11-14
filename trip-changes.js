// A revision starts from a committed choice. Its stable key identifies the
// original agreement even when the learner replays the trip before review.
import { speechLine, readProposal, validProposal } from "./trip-questions.js";
import { normalise } from "./talk-engine.js?v=13";
import { exitOptions } from "./trip-followups.js";

const line = speechLine;
const option = (model, ending, ack, aliases = []) => ({
  model: line(model),
  ending,
  ack: line(ack),
  aliases,
});
const keep = (ending, ack, aliases = []) =>
  option(
    "そのままでお願いします。|そのままでおねがいします。|就按原来的安排。",
    ending,
    ack,
    [
      "そのままで",
      "そのままでいいです",
      "変更なしで",
      "変更ありません",
      "はい",
      "お願いします",
      "大丈夫です",
      ...aliases,
    ],
  );
const plan = (subject, first, alternate, options) => ({
  subject,
  first: line(first),
  alternate: line(alternate),
  options,
});
const dish = (jp, kana, zh) =>
  option(
    jp + "に変えてください。|" + kana + "にかえてください。|请换成" + zh + "。",
    "把咖喱换成了" + zh,
    "カレーを取り消して、" +
      jp +
      "を一つお持ちします。|かれーをとりけして、" +
      kana +
      "をひとつおもちします。|我把咖喱取消，给您上" +
      zh +
      "。",
    [jp, ...(jp === "うどん" ? ["饂飩"] : []), kana].flatMap((s) => [
      s,
      s + "で",
      s + "に",
      s + "でお願いします",
      s + "にします",
      s + "にして",
      s + "にしてください",
      s + "をください",
      s + "をお願いします",
      s + "に変更してください",
      s + "に変更できますか",
      s + "に変えられますか",
      s + "に替えてください",
      s + "に変えてもいいですか",
      s + "にしてもいいですか",
    ]),
  );
const curryOptions = [
  keep(
    "保留了咖喱",
    "はい、カレーのままですね。一人前ご用意します。|はい、かれーのままですね。いちにんまえごよういします。|好，还是咖喱，给您准备一份。",
    [
      "カレー",
      "カレーで",
      "カレーにします",
      "カレーを一つください",
      "カレーで大丈夫です",
      "カレーのままで",
      "カレーをお願いします",
    ],
  ),
  dish("うどん", "うどん", "乌冬面"),
  dish("親子丼", "おやこどん", "亲子丼"),
];
const curry = (hot) =>
  plan(
    "你刚点了咖喱。店员来核对辣度，另有乌冬面和亲子丼。听完可以保留或换一道。",
    hot
      ? "ご注文のカレー、少し辛いんです。辛くないうどんと親子丼もありますが、どうなさいますか。|ごちゅうもんのかれー、すこしからいんです。からくないうどんとおやこどんもありますが、どうなさいますか。|您点的咖喱有点辣。还有不辣的乌冬面和亲子丼，您想怎么选？"
      : "ご注文のカレーは甘口です。うどんと親子丼にも変更できますが、いかがですか。|ごちゅうもんのかれーはあまくちです。うどんとおやこどんにもへんこうできますが、いかがですか。|您点的咖喱是甘口，也可以换成乌冬面或亲子丼，您看呢？",
    hot
      ? "先ほどのカレーは少し辛めです。お作りする前に、注文を変えますか。|さきほどのかれーはすこしからめです。おつくりするまえに、ちゅうもんをかえますか。|刚才点的咖喱有点辣。趁还没做，您想换一道吗？"
      : "先ほどの甘口カレーでよろしいですか。別のお料理になさいますか。|さきほどのあまくちかれーでよろしいですか。べつのおりょうりになさいますか。|刚才点的甘口咖喱可以吗？还是想换道菜？",
    curryOptions,
  );
const stamp = plan(
  "你刚要了一张邮票，结账前还能改数量。",
  "切手は一枚ですね。枚数はこちらでよろしいですか。|きってはいちまいですね。まいすうはこちらでよろしいですか。|邮票是一张，对吗？数量可以吗？",
  "先ほどの切手、一枚のままでいいですか。|さきほどのきって、いちまいのままでいいですか。|刚才要的邮票，还是一张吗？",
  [
    keep(
      "保留一张邮票",
      "はい、切手は一枚ですね。|はい、きってはいちまいですね。|好，邮票一张。",
      ["一枚で", "一枚ください"],
    ),
    option(
      "二枚ください。|にまいください。|请给我两张。",
      "把一张邮票改成两张",
      "一枚から二枚ですね。二枚どうぞ。|いちまいからにまいですね。にまいどうぞ。|从一张改成两张。这是您的两张邮票。",
      [
        "二枚",
        "2枚",
        "二枚にします",
        "二枚でお願いします",
        "二枚にしてください",
        "二枚に変えてください",
        "二枚お願いします",
      ],
    ),
  ],
);
function cake(takeaway) {
  const a = takeaway ? "お持ち帰り" : "店内",
    ar = takeaway ? "おもちかえり" : "てんない";
  const to = takeaway ? "店内" : "持ち帰り",
    tr = takeaway ? "てんない" : "もちかえり";
  const zh = takeaway ? "外带" : "堂食",
    next = takeaway ? "堂食" : "外带";
  return plan(
    "蛋糕已经点好，刚才选的是" + zh + "。只改用餐方式也可以。",
    "ケーキは" +
      a +
      "ですね。今でしたら変更できますが、よろしいですか。|けーきは" +
      ar +
      "ですね。いまでしたらへんこうできますが、よろしいですか。|蛋糕刚选了" +
      zh +
      "，现在还能改，可以吗？",
    "先ほどのケーキ、" +
      a +
      "のままでよろしいでしょうか。|さきほどのけーき、" +
      ar +
      "のままでよろしいでしょうか。|刚点的蛋糕，还是" +
      zh +
      "吗？",
    [
      keep(
        "蛋糕保留" + zh,
        "はい、ケーキは" +
          a +
          "ですね。|はい、けーきは" +
          ar +
          "ですね。|好，蛋糕还是" +
          zh +
          "。",
      ),
      option(
        to +
          "でお願いします。|" +
          tr +
          "でおねがいします。|请改成" +
          next +
          "。",
        "把蛋糕从" + zh + "改为" + next,
        takeaway
          ? "お持ち帰りから店内に変更ですね。ケーキはお席にお届けします。|おもちかえりからてんないにへんこうですね。けーきはおせきにおとどけします。|外带改堂食。我把蛋糕送到您的座位。"
          : "店内からお持ち帰りに変更ですね。ケーキを箱にお入れします。|てんないからおもちかえりにへんこうですね。けーきをはこにおいれします。|堂食改外带。我把蛋糕装盒。",
        [
          to + "で",
          to + "にします",
          to + "に変えてください",
          takeaway ? "ここで食べます" : "持って帰ります",
        ],
      ),
    ],
  );
}
const keychain = plan(
  "你已经挑好红色钥匙扣，包装前还可以换成蓝色。",
  "赤いキーホルダーですね。青もありますが、赤でよろしいですか。|あかいきーほるだーですね。あおもありますが、あかでよろしいですか。|您选了红色钥匙扣。也有蓝色，还是要红色吗？",
  "先ほど選んだ赤をお包みしますか。それとも青になさいますか。|さきほどえらんだあかをおつつみしますか。それともあおになさいますか。|刚才选的红色给您包起来吗？还是想换蓝色？",
  [
    keep(
      "保留红色钥匙扣",
      "では、赤をお包みします。|では、あかをおつつみします。|那我把红色款包起来。",
      ["赤で", "赤でお願いします"],
    ),
    option(
      "青にしてください。|あおにしてください。|请换成蓝色。",
      "把红色钥匙扣换成蓝色",
      "赤から青に変更ですね。こちらの青いキーホルダーをどうぞ。|あかからあおにへんこうですね。こちらのあおいきーほるだーをどうぞ。|红色改成蓝色。这是您的蓝色钥匙扣。",
      [
        "青",
        "青で",
        "青をください",
        "青にします",
        "青いのをください",
        "青に変えてください",
      ],
    ),
  ],
);
const route = plan(
  "你原本打算先去邮局，也可以临时决定先去车站。",
  "先に郵便局に行くんですね。駅にも寄れますけど、どうしますか。|さきにゆうびんきょくにいくんですね。えきにもよれますけど、どうしますか。|您原来想先去邮局。也可以顺路去车站，您怎么打算？",
  "さっきは郵便局とおっしゃいましたね。最初に向かうのはどちらですか。|さっきはゆうびんきょくとおっしゃいましたね。さいしょにむかうのはどちらですか。|刚才说的是邮局。您最后打算先去哪边？",
  [
    keep(
      "还是先去邮局",
      "では、郵便局へは左ですよ。|では、ゆうびんきょくへはひだりですよ。|那去邮局往左。",
      ["郵便局", "郵便局に行きます"],
    ),
    option(
      "先に駅に行きます。|さきにえきにいきます。|我先去车站。",
      "把第一站从邮局改成车站",
      "郵便局より先に駅ですね。駅なら次の角を右です。|ゆうびんきょくよりさきにえきですね。えきならつぎのかどをみぎです。|改成先去车站啊。去车站在下个路口右转。",
      [
        "駅",
        "駅にします",
        "駅に行きます",
        "駅に行きたいです",
        "先に駅へ行きます",
      ],
    ),
  ],
);
const exits = [
  ["東口", "ひがしぐち"],
  ["西口", "にしぐち"],
  ["南口", "みなみぐち"],
  ["北口", "きたぐち"],
];
function gateChange(old) {
  const [from, fr] = exits[old],
    previous = exitOptions[old].label;
  const options = exits.map(([to, tr], i) => {
    const zh = exitOptions[i].label;
    if (old === i)
      return keep(
        "仍在" + zh + "见",
        to +
          "のままだね。そこで待ってるよ。|" +
          tr +
          "のままだね。そこでまってるよ。|还是" +
          zh +
          "，我在那里等你。",
        [...exitOptions[i].aliases, to + "のままで"],
      );
    return option(
      "やっぱり、" +
        to +
        "にしよう。|やっぱり、" +
        tr +
        "にしよう。|还是改到" +
        zh +
        "吧。",
      "把" + previous + "改成" + zh,
      from +
        "から" +
        to +
        "に変更だね。" +
        to +
        "で待ってるよ。|" +
        fr +
        "から" +
        tr +
        "にへんこうだね。" +
        tr +
        "でまってるよ。|从" +
        previous +
        "改到" +
        zh +
        "。我在" +
        zh +
        "等你。",
      [
        ...exitOptions[i].aliases,
        ...[to, tr].flatMap((s) =>
          [
            "に変えよう",
            "に変更しよう",
            "に変えて",
            "に変えてください",
            "に変更してください",
            "にしてもいい",
            "にしてもいいですか",
            "にしない",
            "に変えない",
            "にしようか",
            "に変えてもいい",
            "にできる",
            "にしたい",
            "にします",
          ].map((x) => s + x),
        ),
      ],
    );
  });
  return {
    ...plan(
      "已经约在" + previous + "。可以只换出口，或者按原约定碰面。",
      from +
        "で待ち合わせだね。出口はそこでいい？|" +
        fr +
        "でまちあわせだね。でぐちはそこでいい？|我们约在" +
        previous +
        "碰头。出口就定这里吗？",
      "さっきは" +
        from +
        "って言ってたね。時間はそのままで、どの出口にしようか。|さっきは" +
        fr +
        "っていってたね。じかんはそのままで、どのでぐちにしようか。|刚才说的是" +
        previous +
        "。时间照旧，最后定哪个出口？",
      options,
    ),
    oldExit: old,
  };
}
export const changePlans = {
  stamp,
  curryHot: curry(true),
  curryMild: curry(false),
  cakeOut: cake(true),
  cakeIn: cake(false),
  keychain,
  route,
  ...Object.fromEntries(exits.map((_, i) => ["exit" + i, gateChange(i)])),
};
export const changeExamples = [
  stamp.options[1],
  changePlans.cakeIn.options[1],
  curryOptions[1],
  keychain.options[1],
  route.options[1],
  changePlans.exit1.options[0],
].map((x) => x.model);

// Compare the entire requested replacement, including its source if stated.
export function changeChoice(entry, raw, meeting) {
  const clean = (s) =>
    normalise(s)
      .replace(/おねがい/gu, "お願い")
      .replace(/くださいませ/gu, "ください")
      .replace(/[二2]枚|にまい/gu, "二枚")
      .replace(/ひとつ|１つ|1つ/gu, "一つ")
      .replace(/にしよ$/u, "にしよう")
      .replace(/かえて/gu, "変えて")
      .replace(/へんこう/gu, "変更")
      .replace(/(?:ひがしぐち|東口)/gu, "東口")
      .replace(/(?:にしぐち|西口)/gu, "西口")
      .replace(/(?:みなみぐち|南口)/gu, "南口")
      .replace(/(?:きたぐち|北口)/gu, "北口")
      .replace(/おやこどん/gu, "親子丼")
      .replace(/てんない/gu, "店内")
      .replace(/もちかえり/gu, "持ち帰り")
      .replace(/口出会(?=いませんか|いましょう|おう)/gu, "口で会")
      .replace(
        /^(?:(?:あっ|あの|えっと|すみませんが|ごめんね|ごめん|すみません|すいません|じゃあ|では|はい|やっぱり|やはり|やっぱ|それなら|それじゃ|じゃ|すこし辛いなら|少し辛いなら|辛いなら|辛いので|辛そうなので|やさしい味がいいので|辛いのは苦手なので|辛いのが苦手なので|時間はそのままで|時間は変えずに|出口だけ|場所だけ)(?=.))+/u,
        "",
      );
  let text = clean(raw);
  const timePrefix = text.match(
    /^((?:(?:明日|あした|今日|きょう)の?)?(?:(?:午後|ごご)の?)?(?:[一二三四五六七八九十0-9]+時|[ぁ-ん]+じ)(?:半|はん|[0-9一二三四五六七八九十]+分)?)(?:は|の)?(?:その)?ままで(.+)$/u,
  );
  if (timePrefix && validProposal(meeting)) {
    const stated = readProposal(timePrefix[1], meeting.day === "today" ? 1 : 0);
    if (
      !validProposal(stated) ||
      ["day", "hour", "minute"].some((k) => meeting[k] !== stated[k])
    )
      return;
    text = clean(timePrefix[2]);
  }
  const split = text.match(
    /^(.+?)(?:じゃなくて|ではなくて|じゃなく|ではなく|の代わりに|をやめて|を取り消して|をキャンセルして|から)(.+)$/u,
  );
  if (split) {
    const source = clean(split[1])
      .replace(/^(?:駅の|えきの)/u, "")
      .replace(/(?:を|は)$/u, "");
    const previous =
      entry.oldExit != null
        ? exits[entry.oldExit]
        : {
            curryHot: ["カレー", "野菜カレー", "野菜のカレー"],
            curryMild: ["カレー", "野菜カレー", "野菜のカレー"],
            stamp: ["一枚", "1枚"],
            cakeOut: ["持ち帰り", "テイクアウト"],
            cakeIn: ["店内"],
            keychain: ["赤", "赤いの"],
            route: ["郵便局"],
          }[entry.change];
    if (!previous.some((s) => clean(s) === source)) return;
    text = clean(split[2]);
  }
  // In a spoken hesitation the second phrase is the correction ("西口で…あ、
  // やっぱり東口で"). Only discard a first phrase that affirms the saved choice.
  const pause = text.match(/^(.+?)(?:あっ?|えっと)?(?:やっぱり|やはり)(.+)$/u);
  if (pause) {
    const first = clean(pause[1]),
      old = entry.answers[entry.keepChoice];
    if (
      ![old.model.jp, old.model.kana, ...old.aliases].some(
        (s) => clean(s) === first,
      )
    )
      return;
    text = clean(pause[2]);
  }
  const matches = entry.answers.flatMap((a, i) =>
    [a.model.jp, a.model.kana, ...a.aliases].some((s) => clean(s) === text)
      ? [i]
      : [],
  );
  if (matches.length === 1) return matches[0];
}
