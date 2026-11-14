import {walkQuestion,proposalExample} from "./trip-questions.js";
import { talks } from "./talk-data.js?v=13";

// Each pair picks a real prompt and one branch. The distractor is another
// response the learner has seen, but that cannot answer this specific task.
const days = [
  [
    "x01",
    "hotel",
    "入住时先说有没有预订",
    "在前台说明你订过房，再报出预订姓名。",
    "booking",
    0,
    "name",
    0,
    "前台先查有没有预订，再查用谁的姓名订的。把予約しました和リンです分两次说，中间留给对方追问。",
    "你已经订了房，哪句回答了前台？",
    "这次预订留的是林这个姓，怎么报？",
  ],
  [
    "x02",
    "hotel",
    "听懂住几晚，再选早餐",
    "在入住时分清晚数和早餐，能分别回答。",
    "nights",
    1,
    "breakfast",
    0,
    "一泊的起音是促音，二泊读にはく。听到朝食，说明话题已经换到早餐，可以简单答应。",
    "你后天退房，今天入住，怎么回答？",
    "你打算在旅馆吃早餐，怎么回答？",
  ],
  [
    "x03",
    "directions",
    "问到车站要往哪边走",
    "只说一个目的地，听完再重复一个方向。",
    "destination",
    0,
    "stationWay",
    0,
    "先把駅放到に行きたいです前。对方指路时只抓转弯方向，把右接上ですね确认。",
    "你要赶电车，听完对方的问题怎么接？",
    "练习里去车站要在哪边转？用日语确认。",
  ],
  [
    "x04",
    "directions",
    "换个目的地，重新听左右",
    "把目的地换成邮局，能听出这次不同的方向。",
    "destination",
    1,
    "postWay",
    0,
    "邮局读ゆうびんきょく。先只说这个地名，再说整句。听完这次的指路，伸出对应那只手，再复述。",
    "你要寄明信片，想问怎么去邮局。",
    "你听到的转弯方向怎么核对？",
  ],
  [
    "x05",
    "shop",
    "听懂便当要不要加热",
    "先决定是否加热，再听要哪种餐具。",
    "heat",
    0,
    "utensils",
    1,
    "温めますか问要不要加热。停在はい也能让对方明白。等听到箸或スプーン，再说你想要的餐具。",
    "今天想吃热便当，对方问完你怎么说？",
    "你想用勺子，选哪句？",
  ],
  [
    "x06",
    "shop",
    "把袋子和付款分开答",
    "在同一次结账里先报袋子数量，再报付款方式。",
    "bag",
    0,
    "pay",
    1,
    "袋子也用枚数。先把一枚和ください连起来。听到お支払い再说カード，沿用餐厅的付款句。",
    "你需要一个袋子，怎么接？",
    "你身上没有现金，准备用卡。",
  ],
  [
    "x07",
    "directions",
    "看不懂路线时请对方指地图",
    "从口头方向切换到地图，再自己复述。",
    "postWay",
    0,
    "distance",
    0,
    "先复述听到的左，再听对方报步行时间。仍没把握时拿出地图，把地図放在请求开头。",
    "对方说完转弯方向，你先怎么确认？",
    "对方接着报了步行时间，你还想在地图上看一下。",
  ],
  [
    "x08",
    "lost",
    "在失物招领处描述钱包",
    "先说物品，再补颜色，让对方能帮你找。",
    "item",
    0,
    "wallet",
    0,
    "をなくしました说丢了什么。下一句只需要颜色。黒读くろ，和钱包连起来之前，先试着短答黒です。",
    "你丢的是钱包，先怎么说？",
    "你的钱包是黑色，怎么回答这句追问？",
  ],
  [
    "x09",
    "lost",
    "拿错的失物也能说清",
    "告诉工作人员丢失地点，再核对拿出的物品。",
    "where",
    0,
    "check",
    1,
    "先报电车。听到お間違いないですか，对方在请你确认。物品不对时，用いいえ开头，接違います。",
    "你记得把东西落在车厢里了。",
    "对方拿出的包不属于你，怎么接？",
  ],
  [
    "x10",
    "event",
    "到展会窗口买当天的票",
    "先问当日券，再用枚报票数。",
    "ticket",
    1,
    "count",
    1,
    "当日券是今天入场的票。当对方说有票，接下来要听何枚。把之前车站用过的二枚搬过来。",
    "你没预约，想买今天的票，怎么回答？",
    "你和朋友要两张票。",
  ],
  [
    "x11",
    "event",
    "出示预约，核对入口楼层",
    "把预约画面给工作人员看，再复述入口楼层。",
    "show",
    0,
    "entry",
    0,
    "听到画面和見せて，拿出手机说はい、どうぞ。听到二階，复述楼层，把句末变成ですね。",
    "预约页面已经打开，怎么接工作人员的话？",
    "听完工作人员的说明，怎么确认入口的楼层？",
  ],
  [
    "x12",
    "meetup",
    "把见面日子和几点说清",
    "先约明天，再定两点，听懂朋友问哪一种时间。",
    "day",
    1,
    "tomorrow",
    0,
    "いつ可以先回答哪一天。朋友明确问何時，才说几点。分两次约定，听完每个问题再答。",
    "你今天没空，明天可以。",
    "你想约明天下午两点。",
  ],
  [
    "x13",
    "meetup",
    "把车站细化到一个出口",
    "约在车站碰面，再用东口或西口缩小范围。",
    "spot",
    0,
    "exit",
    0,
    "駅只是大地点。对方追问どの出口时，用ひがしぐち报东口，或用にしぐち报西口。",
    "你想先约在车站见。",
    "你想在东口等朋友。",
  ],
  [
    "x14",
    "event",
    "在展会上自己把对话接下去",
    "凭预约进场，听到对方征询问题时，主动问能不能拍照。",
    "ticket",
    0,
    "entry",
    1,
    "先报预约，把手机页面出示给对方。工作人员说完入口位置，别急着道谢。把写真放进学过的许可句，再听清会场的回答。",
    "你已有预约，如何开始办理入场？",
    "你已经知道在哪层，接下来想问是否允许拍照。",
  ],
];
export const extensionLessons = days.map(
  ([id, scene, title, goal, k1, i1, k2, i2, tip, q1, q2]) => {
    const s = talks[scene],
      pair = [s.nodes[k1], s.nodes[k2]],
      picked = [pair[0].edges[i1].model, pair[1].edges[i2].model];
    const quiz = [q1, q2].map((prompt, i) => {
      const node = pair[i],
        model = picked[i],
        answer = (Number(id.slice(1)) + i) % 3;
      const foils = [
        ...new Set([
          ...node.edges.map((e) => e.model.jp),
          picked[1 - i].jp,
          ...pair[1 - i].edges.map((e) => e.model.jp),
        ]),
      ]
        .filter((t) => t !== model.jp)
        .slice(0, 2);
      foils.splice(Math.min(answer, foils.length), 0, model.jp);
      return {
        prompt: "听对方说完。" + prompt,
        listen: node.prompt.jp,
        options: foils,
        answer: foils.indexOf(model.jp),
        why: node.prompt.zh + " " + model.zh + " " + node.hint,
        model,
        step: i,
        category: "旅行交友接话",
      };
    });
    const dialogue = pair.flatMap((n, i) => [
      { who: s.role, ...n.prompt },
      { who: "你", ...picked[i] },
    ]);
    if (id === "x14")
      dialogue.splice(
        2,
        0,
        { who: s.role, ...s.nodes.show.prompt },
        { who: "你", ...s.nodes.show.edges[0].model },
      );
    const closing = pair[1].edges[i2].ack;
    if (closing) dialogue.push({ who: s.role, ...closing });
    return {
      id,
      scene,
      track: ["event", "meetup"].includes(scene) ? "culture" : "travel",
      title,
      jpTitle: picked[0].jp,
      goal,
      steps: pair.map((n, i) => ({
        title: n.title,
        body:
          i === 0
            ? tip
            : n.hint + " 先听对方原句，再遮住文字，自行换一种回答。",
        examples: [
          n.prompt,
          picked[i],
          ...n.edges
            .map((e) => e.model)
            .filter((m) => m.jp !== picked[i].jp)
            .slice(0, 1),
          ...(i === 1 && id === "x07" ? [walkQuestion] : []),
          ...(i === 1 && id === "x12" ? [proposalExample] : []),
        ],
      })),
      dialogue,
      quiz,
    };
  },
);
