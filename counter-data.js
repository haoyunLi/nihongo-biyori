// Each listening item has a fixed cue, customer goal and answer. Keys survive
// reshuffling so a missed question can be replayed verbatim on another day.
const line = (jp, kana, zh) => ({ jp, kana, zh });
const cue = (jp, kana, zh, clue) => ({ ...line(jp, kana, zh), clue });
export const replies = {
  fish: line(
    "魚の定食を一つください。",
    "さかなのていしょくをひとつください。",
    "请给我一份鱼套餐。",
  ),
  curry: line(
    "カレーを一つください。",
    "かれーをひとつください。",
    "请给我一份咖喱。",
  ),
  two: line("二つお願いします。", "ふたつおねがいします。", "请给我两份。"),
  coffee: line("コーヒーをください。", "こーひーをください。", "请给我咖啡。"),
  out: line(
    "持ち帰りでお願いします。",
    "もちかえりでおねがいします。",
    "我要外带。",
  ),
  in: line("店内でお願いします。", "てんないでおねがいします。", "在店里吃。"),
  card: line("カードでお願いします。", "かーどでおねがいします。", "我刷卡。"),
  cash: line(
    "現金でお願いします。",
    "げんきんでおねがいします。",
    "我付现金。",
  ),
  change: line(
    "じゃあ、カレーをお願いします。",
    "じゃあ、かれーをおねがいします。",
    "那麻烦换成咖喱。",
  ),
};
export const families = {
  order: {
    name: "要点什么",
    step: ["t04", 1],
    reply: "curry",
    clue: "注文（ちゅうもん）是点单，お決まりですか是在问选好了吗。说出菜名，就能接话。",
    examples: [
      cue("ご注文をどうぞ。", "ごちゅうもんをどうぞ。", "请点餐。", "ご注文"),
      cue(
        "ご注文はお決まりですか。",
        "ごちゅうもんはおきまりですか。",
        "您想好点什么了吗？",
        "お決まり",
      ),
    ],
  },
  count: {
    name: "要几份",
    step: ["t04", 0],
    reply: "two",
    clue: "いくつ和何個（なんこ）都问数量。店员已经知道菜名时，可直接说二つ，再礼貌收尾。",
    examples: [
      cue("いくつですか。", "いくつですか。", "要几个？", "いくつ"),
      cue("何個にしますか。", "なんこにしますか。", "您要几个？", "何個"),
    ],
  },
  place: {
    name: "在哪里吃",
    step: ["t04", 2],
    reply: "out",
    clue: "店内、こちらで指在这里吃，お持ち帰り指带走。两种问法下都可以直接报自己的选择。外带也常说テイクアウト。",
    examples: [
      cue(
        "店内でお召し上がりですか。",
        "てんないでおめしあがりですか。",
        "您在店里用餐吗？",
        "店内",
      ),
      cue(
        "お持ち帰りですか。",
        "おもちかえりですか。",
        "您是要外带吗？",
        "お持ち帰り",
      ),
    ],
  },
  drink: {
    name: "喝什么",
    step: ["m02", 0],
    reply: "coffee",
    clue: "饮料听作のみもの。有时店员省略后半句，只说「お飲み物は？」。也要留意菜单上的ドリンク（饮料）。用饮料名接ください即可。",
    examples: [
      cue("お飲み物は？", "おのみものは？", "饮料呢？", "お飲み物"),
      cue(
        "お飲み物は何にしますか。",
        "おのみものはなににしますか。",
        "饮料要选什么？",
        "何にしますか",
      ),
    ],
  },
  pay: {
    name: "怎么付款",
    step: ["t05", 2],
    reply: "card",
    clue: "お支払い（おしはらい）是付款，カード、現金是付款方式。「～でお願いします」在这里要填付款方式。",
    examples: [
      cue("お支払い方法は？", "おしはらいほうほうは？", "怎么付？", "お支払い"),
      cue(
        "現金ですか、カードですか。",
        "げんきんですか、かーどですか。",
        "现金还是刷卡？",
        "現金・カード",
      ),
    ],
  },
  stock: {
    name: "还有没有这道菜",
    step: ["t07", 1],
    reply: "change",
    clue: "売り切れ和売り切れてしまいました都表示已经卖完。「終わりました」用在今天的餐品上，也可能是当天已售完。听见まだあります表示还有，可以照原计划点餐。",
    examples: [
      cue(
        "すみません。今日は売り切れです。",
        "すみません。きょうはうりきれです。",
        "抱歉，今天卖完了。",
        "売り切れ",
      ),
      cue(
        "魚の定食はもう終わりました。",
        "さかなのていしょくはもうおわりました。",
        "鱼套餐今天已经供应完了。",
        "もう終わりました",
      ),
    ],
  },
};
const basic =
  "你先点一份咖喱，等问到饮料再点咖啡，最后带走。只回答店员现在问的事。";
const buns = "你要两个面包配咖啡，在店里吃。回答店员现在问的那一件事。";
const till = "你想外带，身上有现金，打算刷卡。回答店员现在问的那一件事。";
const sold = "你本想吃鱼套餐，如果没有就改点咖喱。听店员说完再决定。";
function item(id, family, line, goal, options, reply) {
  const model = replies[reply];
  return {
    id,
    family,
    cue: line,
    goal,
    model,
    options: options.map((k) => replies[k].jp),
    answer: options.indexOf(reply),
  };
}
// First retrieve the answer to a demonstrated question with the transcript hidden.
export const guided = [
  item(
    "menu",
    "order",
    families.order.examples[1],
    basic,
    ["out", "curry", "card"],
    "curry",
  ),
  item(
    "pieces",
    "count",
    families.count.examples[1],
    buns,
    ["coffee", "in", "two"],
    "two",
  ),
  item(
    "here",
    "place",
    families.place.examples[1],
    buns,
    ["in", "two", "out"],
    "in",
  ),
  item(
    "coffee",
    "drink",
    families.drink.examples[1],
    basic,
    ["out", "coffee", "curry"],
    "coffee",
  ),
  item(
    "payment",
    "pay",
    families.pay.examples[1],
    till,
    ["card", "out", "cash"],
    "card",
  ),
  item(
    "instead",
    "stock",
    families.stock.examples[1],
    sold,
    ["fish", "card", "change"],
    "change",
  ),
];
export const mixed = [
  item(
    "chosen",
    "order",
    cue("お決まりですか。", "おきまりですか。", "选好了吗？", "お決まり"),
    basic,
    ["curry", "coffee", "out"],
    "curry",
  ),
  item(
    "kitchen",
    "order",
    cue(
      "お料理は何になさいますか。",
      "おりょうりはなにになさいますか。",
      "您要点什么菜？",
      "お料理",
    ),
    basic,
    ["coffee", "out", "curry"],
    "curry",
  ),
  item(
    "number",
    "count",
    cue(
      "パンはいくつになさいますか。",
      "ぱんはいくつになさいますか。",
      "面包您要几个？",
      "いくつ",
    ),
    buns,
    ["in", "two", "coffee"],
    "two",
  ),
  item(
    "howmany",
    "count",
    cue(
      "パンは何個ご用意しましょうか。",
      "ぱんはなんこごよういしましょうか。",
      "给您准备几个面包？",
      "何個",
    ),
    buns,
    ["two", "in", "coffee"],
    "two",
  ),
  item(
    "eat-here",
    "place",
    cue(
      "こちらで召し上がりますか。",
      "こちらでめしあがりますか。",
      "您在这里吃吗？",
      "こちらで",
    ),
    basic,
    ["curry", "in", "out"],
    "out",
  ),
  item(
    "to-go",
    "place",
    cue(
      "テイクアウトでよろしいですか。",
      "ていくあうとでよろしいですか。",
      "跟您确认，是要外带吗？",
      "テイクアウト",
    ),
    buns,
    ["out", "in", "two"],
    "in",
  ),
  item(
    "drink-choice",
    "drink",
    cue(
      "ドリンクは何になさいますか。",
      "どりんくはなにになさいますか。",
      "您喝点什么？",
      "ドリンク",
    ),
    basic,
    ["out", "curry", "coffee"],
    "coffee",
  ),
  item(
    "with-drink",
    "drink",
    cue(
      "お飲み物はいかがですか。",
      "おのみものはいかがですか。",
      "您要来点饮料吗？",
      "お飲み物",
    ),
    buns,
    ["in", "coffee", "two"],
    "coffee",
  ),
  item(
    "pay-how",
    "pay",
    cue(
      "お支払いはどうなさいますか。",
      "おしはらいはどうなさいますか。",
      "您想怎么付款？",
      "お支払い",
    ),
    till,
    ["out", "card", "cash"],
    "card",
  ),
  item(
    "pay-card",
    "pay",
    cue(
      "カードでのお支払いですか。",
      "かーどでのおしはらいですか。",
      "您是刷卡吗？",
      "カードでのお支払い",
    ),
    "你要外带，今天打算用现金付款。回答店员的确认。",
    ["card", "cash", "out"],
    "cash",
  ),
  item(
    "available",
    "stock",
    cue(
      "魚の定食なら、まだございます。",
      "さかなのていしょくなら、まだございます。",
      "鱼套餐的话，还有。",
      "まだございます",
    ),
    sold,
    ["fish", "change", "out"],
    "fish",
  ),
  item(
    "sold-out",
    "stock",
    cue(
      "あいにく、魚の定食は売り切れてしまいました。",
      "あいにく、さかなのていしょくはうりきれてしまいました。",
      "真不巧，鱼套餐已经卖完了。",
      "売り切れて",
    ),
    sold,
    ["change", "fish", "out"],
    "change",
  ),
];
// Required daily checks use new cues after the lesson demonstration.
export const dailyCounters = [
  item(
    "chap-place",
    "place",
    cue(
      "お店で召し上がりますか。",
      "おみせでめしあがりますか。",
      "您在店里吃吗？",
      "お店で",
    ),
    "你打算要两份咖喱，带回酒店吃。只回答店员这一次问的事。",
    ["two", "in", "out"],
    "out",
  ),
  item(
    "chap-drink",
    "drink",
    cue(
      "お飲み物はどうしますか。",
      "おのみものはどうしますか。",
      "您要什么饮料？",
      "お飲み物",
    ),
    basic,
    ["out", "curry", "coffee"],
    "coffee",
  ),
  item(
    "chap-pay",
    "pay",
    cue(
      "お支払いは現金でよろしいですか。",
      "おしはらいはげんきんでよろしいですか。",
      "您是要付现金吗？",
      "現金でよろしいですか",
    ),
    till,
    ["cash", "out", "card"],
    "card",
  ),
  item(
    "chap-stock",
    "stock",
    cue(
      "すみません、魚の定食は売り切れました。",
      "すみません、さかなのていしょくはうりきれました。",
      "抱歉，鱼套餐卖完了。",
      "売り切れました",
    ),
    sold,
    ["fish", "change", "card"],
    "change",
  ),
];
export function addCounterChecks(lessons) {
  for (const q of dailyCounters) {
    const f = families[q.family],
      [id, step] = f.step;
    lessons
      .find((l) => l.id === id)
      .quiz.push({
        prompt: q.goal + " 听完再选哪句能接上。",
        options: q.options,
        answer: q.answer,
        model: q.model,
        step,
        category: "柜台接话",
        listen: q.cue.jp,
        why:
          q.cue.jp +
          "（" +
          q.cue.kana +
          "）是“" +
          q.cue.zh +
          "”。听「" +
          q.cue.clue +
          "」。" +
          f.clue,
      });
  }
}
export const availableExample = cue(
  "魚の定食はまだあります。",
  "さかなのていしょくはまだあります。",
  "鱼套餐还有。",
  "まだあります",
);
export const counterSpeech = [
  availableExample,
  ...Object.values(replies),
  ...Object.values(families).flatMap((f) => f.examples),
  ...[...mixed, ...dailyCounters].map((c) => c.cue),
];
export const finalQuizCue = cue(
  "お持ち帰りになさいますか。",
  "おもちかえりになさいますか。",
  "您是要带走吗？",
  "お持ち帰り",
);
export const finalCues = [
  cue(
    "申し訳ありません。魚の定食は今日はもうございません。",
    "もうしわけありません。さかなのていしょくはきょうはもうございません。",
    "抱歉，今天已经没有鱼套餐了。",
    "もうございません",
  ),
  cue(
    "こちらでお召し上がりになりますか。",
    "こちらでおめしあがりになりますか。",
    "您是在这儿用餐吗？",
    "こちらで",
  ),
];
