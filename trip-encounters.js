// Each encounter replaces two turns in place: a decision, then a different
// spoken follow-up for each intent. No fork adds time to the day's itinerary.
import { weeklyTrips } from "./weekly-trips.js";
import { chapterTurns, chapterAnswer } from "./chapter-talk-data.js";
import { normalise } from "./talk-engine.js?v=13";
import {
  tripQuestion,
  walkQuestion,
  proposalExample,
  readProposal,
  validProposal,
  timeAvailable,
  proposalLines,
  availableReply,
  busyReply,
  clockSpeech,
  speechLine,
  questionForm,
} from "./trip-questions.js";

const line = (s) => {
  const [jp, kana, zh] = s.split("|");
  return { jp, kana, zh };
};
const extra = {
  three: {
    ...chapterTurns.get("x12.1"),
    model: line("三時がいいです。|さんじがいいです。|三点比较好。"),
    aliases: [
      "三時",
      "3時",
      "3時がいいです",
      "三時で",
      "三時にしましょう",
      "三時なら大丈夫です",
      "3時なら大丈夫です",
      "三時にお願いします",
      "さんじでおねがいします",
    ],
    base: null,
  },
};
const pick = (ref, ending, nextRef, situation, follow, ...aliases) => ({
  ref,
  ending,
  nextRef,
  situation,
  follow: line(follow),
  aliases,
});
const meet = (
  index,
  stop,
  scene,
  role,
  name,
  setting,
  q,
  reword,
  ...options
) => ({
  index,
  stop,
  scene,
  role,
  name,
  setting,
  q: line(q),
  reword: line(reword),
  options,
});
const encounters = [
  [
    meet(
      2,
      2,
      "shop",
      "店员",
      "给明信片挑图案",
      "奶奶喜欢风景。店里有海景卡和山景卡，选你想寄的那张；海上有船，山顶挂着月亮。",
      "海と山、どちらの絵はがきがいいですか。|うみとやま、どちらのえはがきがいいですか。|海景和山景，您想要哪张明信片？",
      "はがきの絵は、山にしますか、海にしますか。|はがきのえは、やまにしますか、うみにしますか。|明信片的图案选山还是海？",
      pick(
        "f04.0",
        "挑了海景卡",
        "f04.1",
        "你挑了海景卡。远处的海面上画着一艘船。",
        "海の絵ですね。海に何が浮かんでいますか。|うみのえですね。うみになにがうかんでいますか。|选海景啊。海上漂着什么？",
        "海の絵",
        "海の絵はがき",
      ),
      pick(
        "f05.0",
        "挑了山景卡",
        "f03.1",
        "你挑了夜晚的山景卡，山顶上方画着月亮。",
        "山の絵ですね。山の上に何が見えますか。|やまのえですね。やまのうえになにがみえますか。|选山景啊。山顶上方能看到什么？",
        "山の絵",
        "山の絵はがき",
      ),
    ),
    meet(
      2,
      2,
      "shop",
      "店员",
      "常买的明信片卖完了",
      "风景卡售罄了。店员拿来猫咪卡和小船卡；猫咪卡有蓝色款，小船卡想寄给奶奶。",
      "風景のはがきは売り切れです。猫と船、どちらがいいですか。|ふうけいのはがきはうりきれです。ねことふね、どちらがいいですか。|风景卡卖完了。要猫咪卡还是小船卡？",
      "残っている絵は猫と船です。どっちにしますか。|のこっているえはねことふねです。どっちにしますか。|剩下猫和船两种图案，选哪个？",
      pick(
        "f03.0",
        "改选了猫咪卡",
        "f01.0",
        "你选了猫咪卡。眼前这张是蓝色的，你想要这个颜色。",
        "猫ですね。何色がいいですか。|ねこですね。なにいろがいいですか。|选猫啊。想要什么颜色？",
        "猫のはがき",
      ),
      pick(
        "f04.1",
        "改选了小船卡",
        "f07.1",
        "你选了小船卡，打算寄给奶奶。",
        "船のはがきですね。どなたに出すんですか。|ふねのはがきですね。どなたにだすんですか。|选小船卡啊。您要寄给谁？",
        "船のはがき",
      ),
    ),
  ],
  [
    meet(
      3,
      2,
      "restaurant",
      "店员",
      "食堂开始供应下午茶",
      "集市食堂午餐和甜品都还有。想吃正餐可以点一份咖喱，也可以先单点蛋糕。",
      "カレーとケーキ、どちらになさいますか。|かれーとけーき、どちらになさいますか。|咖喱和蛋糕，您想要哪一种？",
      "お食事のカレーにしますか、それともケーキですか。|おしょくじのかれーにしますか、それともけーきですか。|是点咖喱当正餐，还是点蛋糕？",
      pick(
        "t04.1",
        "点了咖喱",
        "t04.0",
        "你点了咖喱，朋友在店里占好了座。",
        "カレーですね。こちらでお召し上がりですか。|かれーですね。こちらでおめしあがりですか。|咖喱对吧。您在店内吃吗？",
        "カレー",
        "カレーお願いします",
      ),
      pick(
        "f08.1",
        "点了蛋糕",
        "f08.0",
        "你点了蛋糕，想配一杯咖啡。",
        "ケーキですね。ご一緒にお飲み物はいかがですか。|けーきですね。ごいっしょにおのみものはいかがですか。|蛋糕对吧。要配点喝的吗？",
        "ケーキをお願いします",
      ),
    ),
    meet(
      3,
      2,
      "restaurant",
      "店员",
      "午餐收摊了",
      "你来晚了一点，咖喱卖完了。可以改点蛋糕，也可以只喝杯咖啡。",
      "すみません、カレーは売り切れです。ケーキかコーヒーはいかがですか。|すみません、かれーはうりきれです。けーきかこーひーはいかがですか。|不好意思，咖喱卖完了。蛋糕或咖啡怎么样？",
      "今日はもうカレーがありません。ケーキとコーヒー、どちらにしますか。|きょうはもうかれーがありません。けーきとこーひー、どちらにしますか。|今天没有咖喱了。选蛋糕还是咖啡？",
      pick(
        "f08.1",
        "改点蛋糕",
        "t04.2",
        "你改点了蛋糕，只想配免费的水。",
        "ケーキをお持ちします。お飲み物は何にしますか。|けーきをおもちします。おのみものはなににしますか。|我去拿蛋糕，您想喝什么？",
      ),
      pick(
        "f08.0",
        "改喝咖啡",
        "t04.0",
        "你决定喝咖啡，在店里的空位歇脚。",
        "コーヒーですね。店内でお飲みになりますか。|こーひーですね。てんないでおのみになりますか。|咖啡对吧。您在店内喝吗？",
      ),
    ),
  ],
  [
    meet(
      3,
      3,
      "restaurant",
      "店员",
      "晚饭菜单快售完了",
      "晚饭时段快结束了。可以问还有没有鱼套餐，也可以直接点一份咖喱。",
      "今からですと、魚の定食かカレーになります。ご注文は？|いまからですと、さかなのていしょくかかれーになります。ごちゅうもんは？|这个时间供应鱼套餐或咖喱。您想点什么？",
      "夕食はカレーにしますか。魚の定食についてお聞きになりますか。|ゆうしょくはかれーにしますか。さかなのていしょくについておききになりますか。|晚饭点咖喱，还是想问问鱼套餐？",
      pick(
        "t07.0",
        "询问了鱼套餐",
        "t07.1",
        "店员刚核对过厨房。要是鱼没了，你的第二选择是咖喱。",
        "確認しましたが、魚は売り切れです。代わりは何にしますか。|かくにんしましたが、さかなはうりきれです。かわりはなににしますか。|确认过了，鱼卖完了。想换什么？",
        "魚の定食",
        "魚定食はありますか",
      ),
      pick(
        "m02.0",
        "直接点了咖喱",
        "m02.1",
        "你点了咖喱，又看中了柜台上的小菜，想指着它加一份。",
        "カレーですね。ほかに追加のご注文はありますか。|かれーですね。ほかについかのごちゅうもんはありますか。|要咖喱。还想加点什么吗？",
        "カレー",
        "カレーでお願いします",
      ),
    ),
    meet(
      3,
      3,
      "restaurant",
      "店员",
      "想追加的鱼套餐卖完了",
      "你已经吃了小菜，正想追加鱼套餐。听听店员怎么说，再决定换咖喱还是直接结账。",
      "申し訳ありません、魚は売り切れです。カレーにしますか、お会計にしますか。|もうしわけありません、さかなはうりきれです。かれーにしますか、おかいけいにしますか。|抱歉，鱼卖完了。您换咖喱，还是现在结账？",
      "魚の定食はもうありません。代わりにカレーを頼みますか、それともお会計ですか。|さかなのていしょくはもうありません。かわりにかれーをたのみますか、それともおかいけいですか。|鱼套餐没有了，改点咖喱还是结账？",
      pick(
        "t07.1",
        "改点咖喱",
        "t04.2",
        "你改点了咖喱，只想配一杯水。",
        "ではカレーをお作りします。お飲み物はいかがですか。|ではかれーをおつくりします。おのみものはいかがですか。|那我去做咖喱。想喝点什么？",
        "カレー",
        "カレーにします",
        "カレーを一つください",
      ),
      pick(
        "t07.2",
        "选择结账",
        "t05.1",
        "你决定直接结账，身上只有银行卡。",
        "かしこまりました。小鉢は三百円です。お支払いはどうなさいますか。|かしこまりました。こばちはさんびゃくえんです。おしはらいはどうなさいますか。|好的。小菜三百日元，您怎么付款？",
        "お会計",
        "会計",
        "お勘定お願いします",
        "お会計で",
      ),
    ),
  ],
  [
    meet(
      1,
      1,
      "event",
      "展会工作人员",
      "售票和周边共用柜台",
      "朋友在旁边等你。先问当日票，或者先看看想买的钥匙扣，都可以。",
      "当日券とグッズはこちらです。何をお探しですか。|とうじつけんとぐっずはこちらです。なにをおさがしですか。|当日票和周边都在这里。您在找什么？",
      "チケットのご用ですか、それとも気になるグッズがありますか。|ちけっとのごようですか、それともきになるぐっずがありますか。|您要买票，还是在找哪种周边？",
      pick(
        "c02.0",
        "先问了当日票",
        "c02.1",
        "你和朋友各需要一张票。",
        "当日券はまだありますよ。何枚にしますか。|とうじつけんはまだありますよ。なんまいにしますか。|还有当日票，要几张？",
        "当日券",
      ),
      pick(
        "c03.0",
        "先问了钥匙扣",
        "c03.1",
        "工作人员找到了蓝色款，你还想看看别的颜色。",
        "キーホルダーでしたら、青がございます。こちらでよろしいですか。|きーほるだーでしたら、あおがございます。こちらでよろしいですか。|钥匙扣有蓝色款，这个可以吗？",
        "キーホルダー",
      ),
    ),
    meet(
      1,
      1,
      "event",
      "展会工作人员",
      "售票处挪了位置",
      "你刚到展会，找不到售票处，也想在大厅拍照。先办哪件事由你决定。",
      "こんにちは。会場で何かお困りですか。|こんにちは。かいじょうでなにかおこまりですか。|您好，在会场有什么需要帮忙的吗？",
      "入口でお手伝いできることはありますか。|いりぐちでおてつだいできることはありますか。|在入口有什么可以帮您的吗？",
      pick(
        "c05.1",
        "先找售票处",
        "c02.1",
        "工作人员把你领到了临时窗口。你和朋友都还缺票。",
        "売り場はこちらに移りました。当日券は何枚ですか。|うりばはこちらにうつりました。とうじつけんはなんまいですか。|售票处搬到这里了。当日票要几张？",
      ),
      pick(
        "c04.0",
        "先问拍照许可",
        "c04.1",
        "你已经问过能否拍照，听完工作人员的回答后礼貌回应。",
        "すみません、このホールでの撮影はご遠慮ください。|すみません、このほーるでのさつえいはごえんりょください。|不好意思，请不要在这个大厅拍摄。",
      ),
    ),
  ],
  [
    meet(
      3,
      2,
      "directions",
      "路人",
      "邮局和车站在路口两边",
      "买好便当，你可以先去邮局寄卡片，也可以先到车站看时刻表。",
      "郵便局と駅は反対方向です。どちらに行きたいですか。|ゆうびんきょくとえきははんたいほうこうです。どちらにいきたいですか。|邮局和车站方向相反，您想先去哪？",
      "先に向かうのは、駅のほうですか、郵便局のほうですか。|さきにむかうのは、えきのほうですか、ゆうびんきょくのほうですか。|您先往车站还是邮局走？",
      pick(
        "x04.0",
        "先去邮局",
        "x04.1",
        "你决定先寄卡片。听路人的指引，复述转弯方向。",
        "郵便局に行くなら、次の角を左です。|ゆうびんきょくにいくなら、つぎのかどをひだりです。|去邮局的话，下个路口左转。",
        "郵便局",
        "郵便局です",
      ),
      pick(
        "x03.0",
        "先去车站",
        "x03.1",
        "你决定先看时刻表。听路人的指引，复述转弯方向。",
        "駅でしたら、次の角で右に曲がってください。|えきでしたら、つぎのかどでみぎにまがってください。|去车站的话，请在下个路口右转。",
        "駅",
        "駅です",
      ),
    ),
    meet(
      3,
      2,
      "directions",
      "路人",
      "常走的路在施工",
      "要去邮局，熟悉的街却围起来了。可以请路人在地图上指，也可以请他慢一点口头说。",
      "この先は工事中です。どうご案内しましょうか。|このさきはこうじちゅうです。どうごあんないしましょうか。|前方施工，我怎么给您指路好呢？",
      "いつもの道は通れません。地図と口での説明、どちらがいいですか。|いつものみちはとおれません。ちずとくちでのせつめい、どちらがいいですか。|平常那条路不能走。您想看地图还是听我讲？",
      pick(
        "x07.1",
        "请对方指地图",
        "x04.1",
        "路人在地图上指了最近的绕行路口。复述你听到的方向。",
        "地図では、この裏通りを左に曲がります。|ちずでは、このうらどおりをひだりにまがります。|看地图，在这条小街往左转。",
        "地図でお願いします",
      ),
      pick(
        "t08.0",
        "请对方放慢语速",
        "x03.1",
        "路人换了一条好说清的路线，慢慢告诉你怎么走。复述转弯方向。",
        "ゆっくり言いますね。大きな道を、右です。|ゆっくりいいますね。おおきなみちを、みぎです。|我慢点说。到大路，往右。",
        "ゆっくりお願いします",
      ),
    ),
  ],
  [
    meet(
      0,
      0,
      "meetup",
      "朋友",
      "朋友提前下课了",
      "朋友比原计划早下课，明天下午两点或三点都行。挑你方便的时间，碰面地点是车站东口。",
      "明日は早く終わるよ。二時と三時、どっちがいい？|あしたははやくおわるよ。にじとさんじ、どっちがいい？|明天我会早结束。两点和三点，你觉得哪个更好？",
      "明日の待ち合わせ、何時がいい？　二時か三時にしよう。|あしたのまちあわせ、なんじがいい？ にじかさんじにしよう。|明天几点碰头好？两点或三点吧。",
      pick(
        "x12.1",
        "约在两点",
        "x13.1",
        "你选了两点。朋友会直接到车站，想知道在哪个出口等。",
        "二時だね。駅のどの出口で待っていればいい？|にじだね。えきのどのでぐちでまっていればいい？|两点对吧。我在车站的哪个出口等？",
        "2時",
        "二時",
        "2時がいいです",
        "二時なら大丈夫です",
        "二時にしましょう",
      ),
      pick(
        "three",
        "约在三点",
        "x13.0",
        "你选了三点。朋友要先回家一趟，再过来找你。你想约在车站。",
        "三時なら一度家に帰れるよ。どこで会おうか。|さんじならいちどいえにかえれるよ。どこであおうか。|三点的话我可以先回趟家。我们在哪儿见？",
      ),
    ),
    meet(
      0,
      0,
      "meetup",
      "朋友",
      "原定的两点赶不上了",
      "原本约好今天两点。朋友临时有事，听听他能改到什么时候，再决定晚点见还是换一天。",
      "ごめん、今日の二時は無理になった。三時か明日なら会えるけど、どう？|ごめん、きょうのにじはむりになった。さんじかあしたならあえるけど、どう？|抱歉，今天两点赶不上了。三点或明天能见，你呢？",
      "予定が変わって、今日は三時からなんだ。今日の三時にする？　それとも明日？|よていがかわって、きょうはさんじからなんだ。きょうのさんじにする？ それともあした？|我临时改了安排，今天三点后才有空。今天三点见还是明天？",
      pick(
        "three",
        "改到今天三点",
        "x13.1",
        "你同意今天晚一点见。两人都知道要去车站，你打算在东口等。",
        "じゃあ今日の三時ね。駅のどの出口にする？|じゃあきょうのさんじね。えきのどのでぐちにする？|那今天三点。车站哪个出口？",
        "今日の三時",
        "今日の三時でお願いします",
        "今日の三時なら大丈夫です",
      ),
      pick(
        "x12.0",
        "改到明天",
        "x12.1",
        "你决定改天见。明天下午你两点有空。",
        "じゃあ明日にしよう。明日は何時がいい？|じゃああしたにしよう。あしたはなんじがいい？|那改明天吧。明天几点好？",
        "明日",
        "明日にしましょう",
        "明日お願いします",
        "明日でお願いします",
      ),
    ),
  ],
];

export const encounterEntries = new Map();
export const encounterSpeech = [
  ...clockSpeech,
  walkQuestion,
  proposalExample,
  availableReply,
  busyReply,
];
const endings = [
  "和朋友碰了面，吃过午饭，你也为奶奶挑好了明信片。",
  "你逛过同好集市、选了徽章，也在食堂点到了自己想要的东西。",
  "你找到了去京都的站台，办好入住，也说明了自己的晚餐安排。",
  "失物完成登记，展会现场的事也办好了，你带着晚饭回旅馆。",
  "住宿和便当都安排好了。街口的路人也按你的需要指了路。",
  "你和朋友谈妥了新的安排，后来顺利会合，登记失物、凭预约进了展馆。",
];
// Natural short replies and common paraphrases, scoped to this question's
// taught intent. Never choose an edge just because an object occurs in it.
const phrases = {
  three: [
    "三時がいい",
    "三時でいいです",
    "三時で大丈夫です",
    "三時でも大丈夫です",
    "三時なら行けます",
    "三時に会いましょう",
    "三時にしましょう",
    "三時にしよう",
    "三時はどうですか",
    "三時でお願いします",
    "今日の三時がいいです",
    "今日の三時で",
    "三時に変更しましょう",
  ],
  "x12.0": [
    "明日がいいです",
    "明日で大丈夫です",
    "明日にしよう",
    "明日にします",
    "明日なら行けます",
    "明日なら会えます",
    "明日にしませんか",
    "明日はどうですか",
    "明日でも大丈夫です",
  ],
  "x12.1": [
    "二時でいいです",
    "二時で大丈夫です",
    "二時にしましょう",
    "二時がいい",
    "二時でお願いします",
    "二時に会いましょう",
  ],
  "t07.1": [
    "カレーにします",
    "カレーにしてください",
    "カレーをお願いします",
    "カレーください",
    "カレーを一つ",
    "カレー一つ",
  ],
  "t07.2": [
    "もうお会計お願いします",
    "お会計にします",
    "お会計します",
    "お会計でお願いします",
    "会計でお願いします",
    "お会計にしてください",
    "お勘定をお願いします",
    "チェックお願いします",
  ],
  "t05.1": [
    "カードで",
    "カードでお願いします",
    "カード払いで",
    "カードで払います",
    "クレジットカードでお願いします",
    "カードでも大丈夫ですか",
    "カードでいいですか",
  ],
  "x13.1": ["東口で", "東口がいいです", "東口にしよう", "東口にしましょう"],
  "x13.0": ["駅で", "駅で会おう", "駅がいいです"],
  "f08.0": ["コーヒーにします", "コーヒー一つ", "コーヒーを一杯ください"],
  "f08.1": ["ケーキにします", "ケーキを一つください"],
  "t04.2": ["お水で", "水で", "水をお願いします"],
};
function withPhrases(src, id, more = []) {
  return { ...src, aliases: [...src.aliases, ...(phrases[id] || []), ...more] };
}
for (const [w, pair] of encounters.entries()) {
  for (const [v, e] of pair.entries()) {
    const trip = weeklyTrips[w],
      root = "w" + (w + 1) + "." + v;
    e.id = root;
    const ask = tripQuestion(w + 1);
    const time = ask.ref === "time";
    const initiative = e.options.length;
    const src = time
      ? { model: proposalExample, aliases: [] }
      : ask.ref === "walk"
        ? { model: walkQuestion, aliases: [] }
        : { ...chapterTurns.get(ask.ref), aliases: [] };
    const option = {
      ref: ask.ref,
      ending: ask.ending,
      nextRef: time ? "x13.1" : ask.nextRef,
      situation: time
        ? "朋友接受了你提出的时间。你想和他约在车站东口。"
        : ask.situation,
      follow: time ? availableReply : speechLine(ask.follow),
      aliases: ask.aliases || [],
    };
    e.options.push(option);
    const common = {
      lesson: trip.chapter,
      scene: e.scene,
      role: e.role,
      trip: trip.chapter,
      stop: e.stop,
    };
    e.options.forEach((o, n) => {
      const source =
          n === initiative ? src : extra[o.ref] || chapterTurns.get(o.ref),
        follow = chapterTurns.get(o.nextRef);
      o.answer = withPhrases(source, o.ref, o.aliases);
      o.id = root + "." + n;
      const step = {
        ...common,
        key: o.id,
        goal: o.situation,
        setting: o.situation,
        first: o.follow,
        alternate: follow.alternate,
        model: follow.model,
        answers: [withPhrases(follow, o.nextRef)],
        origin: o.nextRef,
      };
      encounterEntries.set(o.id, step);
      encounterSpeech.push(o.follow);
      if (time && n === initiative) {
        const counter = chapterTurns.get("x12.1");
        encounterEntries.set(o.id + ".later", {
          ...step,
          key: o.id + ".later",
          first: busyReply,
          alternate: counter.alternate,
          goal: "朋友这个时间还在上课。改约明天，自己再提一个下午的时间。",
          setting: "朋友这个时间还在上课。改约明天，自己再提一个下午的时间。",
          model: proposalExample,
          answers: [{ model: proposalExample, aliases: [] }],
          counterTime: true,
        });
      }
    });
    const answers = e.options.map((o) => o.answer);
    encounterEntries.set(root, {
      ...common,
      key: root,
      goal: e.setting,
      setting: e.setting,
      first: e.q,
      alternate: e.reword,
      model: answers[0].model,
      answers,
      choices: e.options,
      initiative,
      initiativeTask: ask.task,
      initiativeRetry: speechLine(ask.retry),
      time,
      edition: v,
    });
    encounterSpeech.push(e.q, e.reword, speechLine(ask.retry));
  }
}
export function tripAttempt(base, edition, choices = {}, proposals = {}) {
  if (!Number.isInteger(edition)) return base; // saved pre-branch itinerary
  const e = encounters[base.week - 1][edition % 2],
    choice = choices[e.id];
  const o = e.options[choice] || e.options[0];
  const turns = [...base.turns],
    stops = base.stops.map((s) => ({ ...s }));
  const step = (key, cue) => ({ id: key, cue, stop: e.stop });
  turns.splice(e.index, 2, step(e.id, e.q), step(o.id, o.follow));
  const proposed = proposals[e.id],
    timed = e.options[choice]?.ref === "time" && validProposal(proposed);
  let outcome = choice !== undefined ? o.ending : "";
  if (timed) {
    const { echo, label } = proposalLines(proposed),
      available = timeAvailable(proposed, edition);
    const follow = step(
      o.id + (available ? "" : ".later"),
      available ? availableReply : busyReply,
    );
    follow.lead = echo;
    turns[e.index + 1] = follow;
    outcome = "提议" + label + "见面";
    if (!available && validProposal(proposals[follow.id])) {
      const revised = proposalLines(proposals[follow.id]);
      outcome += "，最后约在" + revised.label;
      if (turns[e.index + 2])
        turns[e.index + 2] = { ...turns[e.index + 2], lead: revised.echo };
    }
  }
  stops[e.stop].setting = e.setting;
  let intro = base.intro;
  if (base.week === 3)
    intro =
      "坐电车去京都，找到旅馆，再去附近的小店。晚饭能吃到什么，要和店员聊过才知道。";
  if (base.week === 5)
    intro = "办好住宿、买份便当，再到街口问路。下一步怎么走，由你和路人商量。";
  if (base.week === 6) {
    intro =
      "和朋友商量见面的时间，再一起去看展。出了车站还要报失钱包，到了会场得出示预约。";
    stops[1].setting =
      "到了约好的时间，你和朋友在东口会合，翻包时发现钱包不见了。";
  }
  return {
    ...base,
    stops,
    turns,
    intro,
    finish: endings[base.week - 1],
    encounter: e.name,
    outcome,
    edition,
  };
}
export const assignedEntry = (id) =>
  encounterEntries.get(id) || chapterTurns.get(id);
export function assignedAnswer(entry, raw, target, options = {}) {
  if (!entry.answers) return chapterAnswer(entry, raw);
  const propose = entry.time || entry.counterTime;
  const proposal = propose
    ? readProposal(raw, entry.counterTime ? 0 : entry.edition)
    : null;
  const sameTime = (p) =>
    !options.proposal ||
    ["day", "hour", "minute"].every((k) => p[k] === options.proposal[k]);
  const proposalResult = () => ({
    kind: "ok",
    next: null,
    replies: entry.counterTime ? [proposalLines(proposal).echo] : [],
    model: proposalLines(proposal).model.jp,
    choice: entry.initiative,
    proposal,
  });
  if (entry.counterTime) {
    if (proposal?.day === "tomorrow" && sameTime(proposal))
      return proposalResult();
    if (chapterAnswer(entry.answers[0], raw).kind === "repeat")
      return { kind: "repeat" };
    return { kind: "unclear" };
  }
  if (
    entry.time &&
    proposal &&
    (options.initiating || target === entry.initiative) &&
    sameTime(proposal)
  )
    return proposalResult();
  const directProposal =
    entry.time &&
    proposal &&
    (target == null || target === entry.initiative) &&
    sameTime(proposal) &&
    (/どう|いかが|会いま|会おう|にしよ|にしま|会えますか/u.test(raw) ||
      ![14, 15].includes(proposal.hour) ||
      proposal.minute !== 0 ||
      (entry.edition === 1 && proposal.day === "tomorrow"));
  if (directProposal) return proposalResult();
  // Compare complete intents. A mentioned time/place in a refusal must not
  // choose that branch; a self-correction uses the final, affirmed choice.
  const corrected = normalise(raw)
    .replace(/2時/gu, "二時")
    .replace(/3時/gu, "三時")
    .replace(/^(?:ええと|えっと|あの|そうですね|そうですか)/u, "")
    .replace(
      /^(?:今日はちょっと|(?:かれー|魚|二時|三時)(?:は|が)(?:いりません|要りません|無理です))(?:ので|から)?/u,
      "",
    )
    .split(/じゃなくて|ではなくて|じゃなく|ではなく/u)
    .at(-1);
  if (!corrected) return { kind: "unclear" };
  const decisions = entry.answers.map((a, i) => {
    if (entry.time && i === entry.initiative) return { kind: "unclear" };
    if (i === entry.initiative) {
      const clean = (x) => normalise(questionForm(x));
      const match = [a.model.jp, a.model.kana, ...a.aliases].some(
        (x) => clean(x) === clean(raw),
      );
      return match
        ? { kind: "ok", next: null, replies: [], model: a.model.jp }
        : { kind: "unclear" };
    }
    return chapterAnswer({ ...a, base: null }, corrected);
  });
  const matches = decisions.flatMap((r, i) => (r.kind === "ok" ? [i] : []));
  if (
    matches.length === 1 &&
    (target == null || matches[0] === target) &&
    (!options.initiating || matches[0] === entry.initiative)
  )
    return {
      ...decisions[matches[0]],
      choice: entry.choices ? matches[0] : undefined,
    };
  if (!matches.length && decisions.some((r) => r.kind === "repeat"))
    return { kind: "repeat" };
  return { kind: "unclear" };
}
