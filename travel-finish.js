// Original travel lessons and the final spoken tasks. Alternate responses are
// examples for self-check; recordings are compared for timing only.
const p = (jp, kana, romaji, zh) => ({ jp, kana, romaji, zh });
const step = (title, body, ...examples) => ({ title, body, examples });
const line = (who, item) => ({ who, ...item });
const q = (prompt, options, answer, why, model, step, category, listen) => ({
  prompt,
  options,
  answer,
  why,
  model,
  step,
  category,
  listen,
});
const meat = p(
  "肉は入っていますか。",
  "にくははいっていますか。",
  "Niku wa haitte imasu ka.",
  "里面有肉吗？",
);
const fish = p(
  "魚の定食はありますか。",
  "さかなのていしょくはありますか。",
  "Sakana no teishoku wa arimasu ka.",
  "有鱼套餐吗？",
);
const sold = p(
  "すみません。今日は売り切れです。",
  "すみません。きょうはうりきれです。",
  "Sumimasen. Kyō wa urikire desu.",
  "不好意思，今天已经卖完了。",
);
const change = p(
  "じゃあ、カレーをお願いします。",
  "じゃあ、かれーをおねがいします。",
  "Jā, karē o onegaishimasu.",
  "那么，请给我咖喱。",
);
const bill = p(
  "お会計をお願いします。",
  "おかいけいをおねがいします。",
  "Okaikei o onegaishimasu.",
  "麻烦结账。",
);
const write = p(
  "ここに書いてもらえますか。",
  "ここにかいてもらえますか。",
  "Koko ni kaite moraemasu ka.",
  "可以帮我写在这里吗？",
);
const slow = p(
  "もう少しゆっくりお願いします。",
  "もうすこしゆっくりおねがいします。",
  "Mō sukoshi yukkuri onegaishimasu.",
  "请再稍微慢一点。",
);
const platform = p(
  "二番線ですね。",
  "にばんせんですね。",
  "Niban-sen desu ne.",
  "是二号站台，对吧。",
);
const map = p(
  "地図で教えてもらえますか。",
  "ちずでおしえてもらえますか。",
  "Chizu de oshiete moraemasu ka.",
  "可以在地图上给我指一下吗？",
);
const ask = p(
  "京都行きは何番線ですか。",
  "きょうとゆきはなんばんせんですか。",
  "Kyōto-yuki wa nanbansen desu ka.",
  "去京都的车在几号站台？",
);
const stay = p(
  "店内でお願いします。",
  "てんないでおねがいします。",
  "Tennai de onegaishimasu.",
  "在店里吃。",
);
const takeout = p(
  "持ち帰りでお願いします。",
  "もちかえりでおねがいします。",
  "Mochikaeri de onegaishimasu.",
  "我要外带。",
);
const dineQ = p(
  "店内でお召し上がりですか。",
  "てんないでおめしあがりですか。",
  "Tennai de omeshiagari desu ka.",
  "您在店里用餐吗？",
);
const ticket = p(
  "二枚ください。",
  "にまいください。",
  "Ni-mai kudasai.",
  "请给我两张。",
);
const card = p(
  "カードは使えますか。",
  "かーどはつかえますか。",
  "Kādo wa tsukaemasu ka.",
  "可以刷卡吗？",
);
const repeat = p(
  "もう一度お願いします。",
  "もういちどおねがいします。",
  "Mō ichido onegaishimasu.",
  "请再说一遍。",
);
export const tripTasks = [
  {
    place: "车站",
    prompt: "你要去京都。开口问站务员应该去几号站台。",
    model: ask,
    tip: "说出目的地，再问何番線。",
  },
  {
    place: "小店",
    prompt: "你想点鱼套餐。店员这样回答。听完换成咖喱。",
    cue: sold,
    model: change,
    tip: "听到売り切れ就换菜名；用ください或お願いします提出请求都可以。",
  },
  {
    place: "柜台",
    prompt: "你打算带走午饭。听店员的问题，回答你的用餐方式。",
    cue: dineQ,
    model: takeout,
    tip: "持ち帰り表示外带。只说这一词也能表达主要意思。",
  },
  {
    place: "收银台",
    prompt: "吃完后请店员结账，再问能不能刷卡。",
    model: bill,
    extra: card,
    tip: "先用お会計引起注意，再用カード确认付款方式。",
  },
  {
    place: "约见同好",
    prompt: "对方讲的集合地点你没听明白。请对方在地图上指一下。",
    model: map,
    tip: "说出地図，再请对方教你。也可以先请对方复述。",
  },
];
export const travelFinish = [
  {
    id: "t07",
    track: "travel",
    title: "点单遇到缺货，也能顺利结账",
    jpTitle: "売り切れです",
    minutes: 9,
    goal: "问清食材，听懂卖完了，换一道菜，吃完主动结账。",
    steps: [
      step(
        "先问里面有什么",
        "在菜单前指一道菜，用「肉は入っていますか」问有没有肉。「～はありますか」则是问店里有没有某样东西。分别试着问食材和整份套餐。",
        meat,
        fish,
      ),
      step(
        "听到卖完，接一个新请求",
        "売り切れ在展会和餐厅都表示卖完了。用「じゃあ」接住坏消息，换上另一道菜名，再用お願いします收尾。",
        sold,
        change,
      ),
      step(
        "离店前叫店员结账",
        "お会計 是结账。把前面用熟的「～をお願いします」接在后面，就能单独请店员结账。",
        bill,
      ),
    ],
    dialogue: [
      line("你 · 问想要的菜", fish),
      line("店员", sold),
      line("你 · 换一道", change),
      line("你 · 吃完以后", bill),
    ],
    quiz: [
      q(
        "店员这句回答之后，你想继续吃饭，下一步该怎么说？",
        [
          "店内でお願いします。",
          "じゃあ、カレーをお願いします。",
          "お会計をお願いします。",
        ],
        1,
        "卖完的是原来那道菜。换成咖喱继续点单；店内只说明用餐地点。",
        change,
        1,
        "缺货应对",
        sold.jp,
      ),
      q(
        "吃完想结账，你会先说哪一句？",
        ["お会計をお願いします。", "肉は入っていますか。", "二枚ください。"],
        0,
        "结账用お会計。肉是食材，枚用来数票等扁平物品。",
        bill,
        2,
        "提出请求",
      ),
    ],
  },
  {
    id: "t08",
    track: "travel",
    title: "没听清，换一种方式确认",
    jpTitle: "ここに書いてもらえますか",
    minutes: 8,
    goal: "请人放慢、复述、写下数字或指地图，最后自己复述一次。",
    steps: [
      step(
        "先把速度降下来",
        "声音太快时，用ゆっくり请求放慢。没听全时，用もう一度请求再来一次。先挑你更需要的一句说出口。",
        slow,
        repeat,
      ),
      step(
        "数字和地点用不同方法确认",
        "这里是ここ；書いて是“写”；地図で是“用地图”。两句的结尾もらえますか都在委婉请求别人帮忙。",
        write,
        map,
      ),
      step(
        "用听到的数字反问确认",
        "把站员报出的数字放在「～ですね」前，听对方说はい或纠正。练习时替换不同站台号码。",
        platform,
      ),
    ],
    dialogue: [
      line(
        "站员",
        p(
          "二番線です。",
          "にばんせんです。",
          "Niban-sen desu.",
          "在二号站台。",
        ),
      ),
      line("你 · 要求再慢一点", slow),
      line(
        "站员",
        p(
          "二番線です。",
          "にばんせんです。",
          "Niban-sen desu.",
          "在二号站台。",
        ),
      ),
      line("你 · 确认", platform),
    ],
    quiz: [
      q(
        "想让对方把时间写在手机备忘录里，怎么请求？",
        [
          "地図で教えてもらえますか。",
          "ここに書いてもらえますか。",
          "カードは使えますか。",
        ],
        1,
        "書いて是写下来；地図で是用地图。",
        write,
        1,
        "确认信息",
      ),
      q(
        "听到这个回答后，你要原样复述站台号。",
        ["三番線ですね。", "十時ですね。", "二番線ですね。"],
        2,
        "にばんせん是二号站台，复述时保留数字，再换成ですね。",
        platform,
        2,
        "听数字",
        "二番線です。",
      ),
    ],
  },
  {
    id: "t09",
    track: "travel",
    title: "旅行实战：从车站到餐桌",
    jpTitle: "旅の一日",
    minutes: 12,
    goal: "连起问站台、改点菜、选外带、结账和问集合地点，先独立开口，再核对。",
    mission: true,
    steps: [
      step(
        "出发前，先自己问",
        "这次先收起提示，说出目的地和你要问的信息。卡住时只看关键词「京都」「番線」，再补成请求。",
        ask,
      ),
      step(
        "听清店员在问哪件事",
        "先听问题里的店内，再按自己的计划回答。在店内吃和带走是两种不同回应；各自开口说一遍。",
        dineQ,
        stay,
        takeout,
      ),
      step(
        "遇到变化也继续说",
        "菜单缺货、需要结账、没听清约定地点，都有下一句话。下一步进入实战，先关掉文字提示试一次。",
        change,
        bill,
        map,
      ),
    ],
    dialogue: [
      line("你", fish),
      line("店员", sold),
      line("你", change),
      line("店员", dineQ),
      line("你", takeout),
    ],
    quiz: [
      q(
        "吃完饭准备付款，先问能不能刷卡。",
        ["カードは使えますか。", "京都行きは何番線ですか。", "二枚ください。"],
        0,
        "卡是カード；使えますか是询问能否使用。",
        card,
        2,
        "支付确认",
      ),
      q(
        "同伴赶火车，想把午饭带走。听到这句怎么接？",
        [
          "お会計をお願いします。",
          "店内でお願いします。",
          "持ち帰りでお願いします。",
        ],
        2,
        "店员在确认用餐地点。要带走，说持ち帰り。",
        takeout,
        1,
        "听后接话",
        dineQ.jp,
      ),
    ],
  },
];
