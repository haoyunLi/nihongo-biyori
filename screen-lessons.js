// Quoted fragments match the linked distributor synopsis, script or broadcaster
// report. All translations, explanations, dialogues and transfer tasks are ours.
export const sources = {
  welcome: {
    label: "动画《我们这一家》「母、耳がザツ」 · ABEMA 分集介绍",
    url: "https://abema.tv/video/episode/35-34_s1_p162",
  },
  friend: {
    label: "动画《我们这一家》「親友、しみちゃん」 · Apple TV 分集介绍",
    url: "https://tv.apple.com/jp/episode/%E8%A6%AA%E5%8F%8B%E3%81%97%E3%81%BF%E3%81%A1%E3%82%83%E3%82%93%E6%AF%8D%E3%81%8A%E6%98%BC%E5%AF%9D%E3%81%AE%E3%82%B7%E3%83%A3%E3%83%9E%E3%81%A3/umc.cmc.35kjyqchdop78vw8540hiabj8?showId=umc.cmc.p9o72582jxqpc9regcxv4dnt",
  },
  erin: {
    label: "教学短剧《艾琳的挑战》第 8 课 · 国际交流基金剧本",
    url: "https://www.erin.jpf.go.jp/materials/basic/download/erin_lesson08_basic_script.pdf",
  },
  goro: {
    label: "日剧《孤独的美食家》第一季第 1 集 · 东京电视台剧集回顾",
    url: "https://www.tv-tokyo.co.jp/plus/drama/entry/202409/15804.html",
  },
  food: {
    label:
      "综艺《オモウマい店》大阪「からめん亭」 · Locipo 节目报道（2026-09-22）",
    url: "https://locipo.jp/media/gourmet/entry-5457.html",
  },
};
const p = (jp, kana, romaji, zh, source) => ({
  jp,
  kana,
  romaji,
  zh,
  ...(source ? { source } : {}),
});
const step = (title, body, ...examples) => ({ title, body, examples });
const line = (who, item) => ({ who, ...item });
const quiz = (prompt, options, answer, why, model, step, category, listen) => ({
  prompt,
  options,
  answer,
  why,
  model,
  step,
  category,
  ...(listen ? { listen } : {}),
});

const welcome = p(
  "いらっしゃいませーー",
  "いらっしゃいませ",
  "Irasshaimase",
  "欢迎光临。（店员拉长尾音）",
  "welcome",
);
const thisOne = p(
  "これをください。",
  "これをください。",
  "Kore o kudasai.",
  "请给我这个。",
);
const coffee = p(
  "じゃあ、コーヒーをください。",
  "じゃあ、こーひーをください。",
  "Jā, kōhī o kudasai.",
  "那请给我咖啡。",
  "erin",
);
const addOne = p(
  "これも１つください。",
  "これもひとつください。",
  "Kore mo hitotsu kudasai.",
  "这个也请给我一个。",
  "erin",
);
const curry = p(
  "カレーを一つください。",
  "かれーをひとつください。",
  "Karē o hitotsu kudasai.",
  "请给我一份咖喱。",
);
const hungry = p(
  "腹が、減った…",
  "はらが、へった。",
  "Hara ga hetta.",
  "肚子饿了……",
  "goro",
);
const tasty = p(
  "うん、うまい！",
  "うん、うまい！",
  "Un, umai!",
  "嗯，好吃！",
  "goro",
);
const lunch = p(
  "一緒にお昼を食べませんか。",
  "いっしょにおひるをたべませんか。",
  "Issho ni ohiru o tabemasen ka.",
  "要不要一起吃午饭？",
);
const yes = p(
  "いいですね。行きましょう。",
  "いいですね。いきましょう。",
  "Ii desu ne. Ikimashō.",
  "好啊，一起去吧。",
);
const praise = p(
  "めっちゃおいしいです",
  "めっちゃおいしいです",
  "Meccha oishii desu.",
  "特别好吃。",
  "food",
);
const decline = p(
  "そんな気分じゃないから",
  "そんなきぶんじゃないから",
  "Sonna kibun ja nai kara.",
  "因为我现在没那个心情。",
  "friend",
);
const invite = p(
  "一緒にイベントに行きませんか。",
  "いっしょにいべんとにいきませんか。",
  "Issho ni ibento ni ikimasen ka.",
  "要不要一起去活动？",
);
const later = p(
  "今日はちょっと。また今度。",
  "きょうはちょっと。またこんど。",
  "Kyō wa chotto. Mata kondo.",
  "今天不太方便。下次吧。",
);
const okay = p(
  "わかりました。また今度。",
  "わかりました。またこんど。",
  "Wakarimashita. Mata kondo.",
  "明白了。那就下次吧。",
);
export const screenLessons = [
  {
    id: "m01",
    track: "culture",
    title: "逛动漫店，听懂迎客声",
    jpTitle: "いらっしゃいませ",
    minutes: 5,
    goal: "听到店员招呼，认出自己是顾客，再指着周边要一件。",
    steps: [
      step(
        "进门先辨认是谁在说话",
        "《我们这一家》里，妈妈在美容院把迎客声听岔了。留意开头的「い」和中间的「っ」；整句是工作人员迎接客人的固定说法。尾巴上的长横表示这一声拖得很长。",
        welcome,
      ),
      step(
        "从美容院换到周边店",
        "在店门口听到欢迎声，可以点头。真的想买时再指物说「これ」（这个），接「をください」（请给我）。把第一步听懂的招呼和第二步自己要说的话接起来。",
        thisOne,
      ),
    ],
    dialogue: [
      line(
        "店员",
        p(
          "いらっしゃいませ。",
          "いらっしゃいませ。",
          "Irasshaimase.",
          "欢迎光临。",
        ),
      ),
      line("你 · 顾客", thisOne),
    ],
    quiz: [
      quiz(
        "进店听到这句，店员在做什么？",
        ["欢迎你进店", "问你要几个", "请你稍等"],
        0,
        "听到 いらっしゃいませ 就知道是在迎客。这里可以先点头。",
        welcome,
        0,
        "听意图",
        welcome.jp,
      ),
      quiz(
        "你想买手边的周边，接下来自己怎么说？",
        ["いらっしゃいませ。", "これをください。", "どこですか。"],
        1,
        "これ 指身边的东西。をください 把指物变成请求。",
        thisOne,
        1,
        "选对身份",
      ),
    ],
  },
  {
    id: "m02",
    track: "travel",
    title: "看菜单，点一份再加一份",
    jpTitle: "これも一つ",
    minutes: 7,
    goal: "用上一章的「ください」点饮料，听懂「も」和「一つ」后再追加一件。",
    steps: [
      step(
        "在已经会的请求前换名词",
        "《艾琳的挑战》里，店员问喝什么，艾琳先说「じゃあ」（那么），再把饮料放在「をください」前。认出之前学的片假名「コーヒー」。",
        coffee,
      ),
      step(
        "同一句里加上数量和“也”",
        "艾琳还指了另一件食物。「これも」是“这个也”，“一个”在这里读「ひとつ」。第一次点餐可以用 を，已经点过、还要另一件时用 も。",
        addOne,
      ),
      step(
        "换成你的午饭",
        "把咖啡换成咖喱，把数量放在ください前。先看菜单开口，再听一次示范。",
        curry,
      ),
    ],
    dialogue: [
      line("你 · 点第一份", curry),
      line("店员", p("はい。", "はい。", "Hai.", "好的。")),
      line(
        "你 · 再加一份",
        p(
          "これも一つお願いします。",
          "これもひとつおねがいします。",
          "Kore mo hitotsu onegaishimasu.",
          "这个也麻烦给我一个。",
        ),
      ),
    ],
    quiz: [
      quiz(
        "已经点过一样东西，现在又说这句，意思是什么？",
        ["只要这个", "把原来那份取消", "这个也要一个"],
        2,
        "も 表示追加；ひとつ 是一个。先抓这两个声音，再听完整请求。",
        addOne,
        1,
        "听数量",
        addOne.jp,
      ),
      quiz(
        "在小店点一份咖喱，哪句说清了食物和数量？",
        [
          "カレーを一つください。",
          "これはいくらですか。",
          "店内でお願いします。",
        ],
        0,
        "先说要的食物，再说一つ，最后用ください。",
        curry,
        2,
        "换词开口",
      ),
    ],
  },
  {
    id: "m03",
    track: "culture",
    title: "从五郎的独白，走到约同好吃饭",
    jpTitle: "一緒にお昼を",
    minutes: 8,
    goal: "听懂角色说饿了、说好吃，再向初次见面的同好发出一个礼貌邀请。",
    steps: [
      step(
        "先听角色在说自己的感受",
        "《孤独的美食家》门前仲町篇里，五郎心想肚子饿了，吃到烤鸡串又感叹味道。「へった」的 っ 要留一拍。「うまい」在这里是觉得好吃，和熟人聊天时语气随意。",
        hungry,
        tasty,
      ),
      step(
        "把“我饿了”变成一个邀请",
        "在活动现场认识新朋友，先说「一緒に」（一起）。「食べます」是吃，「食べませんか」用否定问句向对方提出邀请，让对方有选择。",
        lunch,
      ),
      step(
        "听见邀请，再明确答应",
        "「いいですね」先表示赞同，「行きましょう」再说一起去。把「お昼」换成想一起做的事，是最后一章会用到的方法。",
        yes,
      ),
    ],
    dialogue: [line("你 · 在展会认识新朋友", lunch), line("同好", yes)],
    quiz: [
      quiz(
        "听到五郎这句独白，他在想什么？",
        ["准备向店员结账", "自己肚子饿了", "约对方一起去"],
        1,
        "腹 是肚子，減った 在这句里是饿了。句中还没有邀请对方的说法。",
        hungry,
        0,
        "听意图",
        hungry.jp,
      ),
      quiz(
        "对刚认识的同好，你想约对方一起吃午饭。",
        ["腹が、減った…", "うん、うまい！", "一緒にお昼を食べませんか。"],
        2,
        "一緒に 指一起；动词后的 ませんか 把感受变成对对方的邀请。",
        lunch,
        1,
        "礼貌接话",
      ),
    ],
  },
  {
    id: "m04",
    track: "culture",
    title: "聊完美食，邀请和婉拒都能接住",
    jpTitle: "また今度",
    minutes: 9,
    goal: "听懂综艺里的称赞，约同好看活动；对方婉拒时自然结束对话。",
    steps: [
      step(
        "从综艺里听出称赞的强度",
        "《オモウマい店》大阪「からめん亭」一段，顾客用这几个词夸味道。「めっちゃ」是很口语的“特别”；对刚认识的人说「おいしいです」就够了。",
        praise,
        p("おいしいです。", "おいしいです。", "Oishii desu.", "很好吃。"),
      ),
      step(
        "把午饭邀请换成活动邀请",
        "复用「一緒に～ませんか」。「イベントに行く」是去活动，地点或目的地用 に。说完停一下，把回答的机会留给对方。",
        invite,
      ),
      step(
        "听懂拒绝，也能给台阶",
        "《我们这一家》「親友、しみちゃん」里，朋友用这句解释自己不想去吃蛋糕。気分 是心情，じゃない 是否定，から 引出理由。自己想委婉拒绝时，可以说今天不太方便；听到这样的回答，说下次再约就好。",
        decline,
        later,
        okay,
      ),
    ],
    dialogue: [
      line("你 · 邀请同好", invite),
      line("同好", later),
      line("你 · 接住婉拒", okay),
    ],
    quiz: [
      quiz(
        "顾客在夸菜。“特别、非常”落在哪一个词上？",
        ["めっちゃ", "今度", "一緒に"],
        0,
        "めっちゃ 加强后面形容词的程度。おいしいです 就能礼貌表达“好吃”。",
        praise,
        0,
        "听关键词",
        praise.jp,
      ),
      quiz(
        "听到朋友这样回应邀请，你该怎样接？",
        [
          "二枚ください。",
          "わかりました。また今度。",
          "じゃあ、今すぐ行こう。",
        ],
        1,
        "今日はちょっと 在邀请后常是婉拒；また今度 给双方留出下次再约的余地。",
        okay,
        2,
        "礼貌接话",
        later.jp,
      ),
    ],
  },
];
