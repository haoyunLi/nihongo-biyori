// Each separated unit represents one mora. Only 'spoken' entries need
// dedicated matched-voice clips, the others reuse the existing library.
function sample(jp, audio, mora, zh, focus, spoken) {
  return { jp, audio, beats: mora.split(" "), zh, focus, spoken };
}
export const contrasts = [
  {
    id: "kitte",
    category: "促音",
    title: "来て ／ 切手",
    lesson: "f07",
    step: 1,
    cue: "听「て」前有没有空出一拍。",
    context: "动画里朋友招手让你过来，会说「来て」。在邮局买的是「切手」。",
    self: "回听「きって」时，手指敲三下。第二下舌尖先挡住气流，第三下才放开读「て」。",
    items: [
      sample("来て", "きて", "き て", "过来（对熟人）", [1]),
      sample("切手", "きって", "き っ て", "邮票", [1]),
    ],
  },
  {
    id: "biru",
    category: "片假名长音",
    title: "ビル ／ ビール",
    lesson: "f08",
    step: 1,
    cue: "听「ビ」的元音延续了几拍。",
    context: "看地图时「ビル」是大楼。居酒屋菜单上的「ビール」是啤酒。",
    self: "两边都用同样的拍速。读「ビール」时，让 i 连续响两拍，再轻碰舌尖读「ル」。",
    items: [
      sample("ビル", "ビル", "ビ ル", "大楼", [0], "ビル"),
      sample("ビール", "ビール", "ビ ー ル", "啤酒", [0, 1], "ビール"),
    ],
  },
  {
    id: "obasan",
    category: "长元音",
    title: "おばさん ／ おばあさん",
    lesson: "f07",
    step: 2,
    cue: "听「ば」和「さ」之间，a 有没有延长。",
    context: "看家庭题材的动画时，人物的亲属称呼有时只差一拍。",
    self: "敲四下读「お・ば・さ・ん」，最后给ん一整拍。再读「おばあさん」，保持拍速，把中间的 a 多留一拍。",
    items: [
      sample("おばさん", "おばさん", "お ば さ ん", "阿姨、姑姨辈的亲属", [1]),
      sample(
        "おばあさん",
        "おばあさん",
        "お ば あ さ ん",
        "奶奶、外婆，年长女性",
        [1, 2],
      ),
    ],
  },
  {
    id: "byouin",
    category: "拗音",
    title: "病院 ／ 美容院",
    lesson: "f07",
    step: 0,
    cue: "听开头是同一拍的「びょ」，还是分开的「び・よ」。",
    context: "在地图里搜地点，一个是看病的医院，一个是剪发的美发店。",
    self: "两词末尾都是「い・ん」。先只练开头，びょ一次敲完，び・よ要敲两下，后面的う都把 o 延长一拍。",
    items: [
      sample("病院", "びょういん", "びょ う い ん", "医院", [0], "病院"),
      sample(
        "美容院",
        "びよういん",
        "び よ う い ん",
        "美发店",
        [0, 1],
        "美容院",
      ),
    ],
  },
  {
    id: "kinen",
    category: "拨音",
    title: "記念 ／ 禁煙",
    lesson: "f05",
    step: 2,
    cue: "听「き」后面是直接读ね，还是先留一拍给ん。",
    context: "活动海报上会写「記念」。车站和旅馆的「禁煙」提示禁止吸烟。",
    self: "记住两词末尾都有ん。「きんえん」在き后面还多一个ん，下一拍才打开口形发え。",
    items: [
      sample("記念", "きねん", "き ね ん", "纪念", [1], "記念"),
      sample("禁煙", "きんえん", "き ん え ん", "禁止吸烟", [1, 2], "禁煙"),
    ],
  },
  {
    id: "kaga",
    category: "清音与浊音",
    title: "か ／ が",
    lesson: "f06",
    step: 0,
    cue: "结尾都是 a，注意听开头的辅音。",
    context:
      "读か行和が行时，右上角的两点会改变起音。练完可以回课文听「かき」和「かぎ」。",
    self: "用同样的音量读两遍。か由 k 起音，が由 g 起音，让声带参与发声。",
    items: [
      sample("か", "か", "か", "ka · 清音", [0]),
      sample("が", "が", "が", "ga · 浊音", [0]),
    ],
  },
  {
    id: "shichi",
    category: "辅音起音",
    title: "し ／ ち",
    lesson: "f03",
    step: 0,
    cue: "听开头是擦出的气流，还是先堵住再释放。",
    context: "「すし」末尾是し，「地下（ちか）」开头是ち。两者都接 i。",
    self: "先单读し，让气流从窄缝擦出。再读ち，先短暂挡住气流再放开，各用一拍。",
    items: [
      sample("し", "し", "し", "shi · 先擦出气流", [0]),
      sample("ち", "ち", "ち", "chi · 先阻住再释放", [0]),
    ],
  },
];
export const contrastById = new Map(contrasts.map((p) => [p.id, p]));
export function listeningRound(random = Math.random) {
  const order = [0, 0, 1, 1];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
