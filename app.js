import { lessons, references } from "./lessons.js";
import { kanaRows, kanaNotes, extraKana } from "./kana.js";
import { strokes } from "./strokes.js";
import { speak, stopAudio } from "./audio.js";

const tracks = [
  {
    id: "foundations",
    name: "假名与发音",
    art: "kana",
    alt: "樱花旁的五元音练字页",
    description: "从五个元音开始，逐行学会假名，听出长短音，再把词连成句。",
  },
  {
    id: "travel",
    name: "旅行日语",
    art: "travel",
    alt: "旅行者在海边车站候车",
    description:
      "在车站问路、餐厅点餐、旅馆入住。跟着对话，把每一句用在旅途中。",
  },
  {
    id: "culture",
    name: "二次元日语",
    art: "anime",
    alt: "咖啡旁翻开的漫画",
    description: "聊喜欢的角色，去展会买周边，听懂朋友口语和动画台词的语气。",
  },
];
const icons = {
  arrow: '<path d="M3 12h17m-6-6 6 6-6 6"/>',
  chevron: '<path d="m8 4 8 8-8 8"/>',
  volume:
    '<path d="m11 4-6 5H2v6h3l6 5z"/><path d="M15 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14"/>',
  star: '<path d="m12 2.5 3.1 6.2 6.8 1-4.9 4.8 1.2 6.8-6.2-3.2-6.2 3.2 1.2-6.8-4.9-4.8 6.8-1z"/>',
  check: '<path d="m3 13 6 6L21 5"/>',
  replay: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
  play: '<path d="m7 4 13 8-13 8z"/>',
  slow: '<circle cx="12" cy="13" r="8"/><path d="M12 9v5l3 2M9 2h6"/>',
};
const ic = (name) =>
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' +
  icons[name] +
  "</svg>";
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const imagePath = (id) => "./assets/art/" + id + ".webp";
const lessonById = new Map(lessons.map((l) => [l.id, l]));
const allKana = kanaRows.flatMap((r) => r.items.filter(Boolean));
const examples = new Map();
function registerExample(key, item) {
  examples.set(key, item);
  return key;
}
for (const lesson of lessons) {
  lesson.steps.forEach((step, s) =>
    step.examples.forEach((item, e) =>
      registerExample(lesson.id + ".s" + s + "." + e, item),
    ),
  );
  lesson.dialogue.forEach((item, d) =>
    registerExample(lesson.id + ".d" + d, item),
  );
}
const storageKey = "nihongo-biyori-learning-v1";
const defaults = {
  done: [],
  saved: [],
  mistakes: [],
  positions: {},
  last: "",
  slow: false,
  readings: true,
  meanings: true,
};
let state = structuredClone(defaults);
try {
  const data = JSON.parse(localStorage.getItem(storageKey) || "{}");
  for (const key of ["done", "saved", "mistakes"])
    if (Array.isArray(data?.[key]))
      state[key] = [...new Set(data[key].filter((x) => typeof x === "string"))];
  if (data?.positions && typeof data.positions === "object")
    state.positions = data.positions;
  for (const key of ["slow", "readings", "meanings"])
    if (typeof data?.[key] === "boolean") state[key] = data[key];
  if (lessonById.has(data?.last)) state.last = data.last;
} catch {
  /* First visit or storage unavailable. */
}
let noticeTimer;
function notify(message) {
  document.querySelector("#notice").textContent = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(
    () => (document.querySelector("#notice").textContent = ""),
    4200,
  );
}
function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    notify("浏览器未能保存进度。本次打开期间可继续学习。");
  }
}
const main = document.querySelector("main");
const session = {
  reviewTab: "saved",
  reviewIndex: 0,
  flipped: false,
  reviewAnswer: null,
  kanaType: "hira",
  kana: "あ",
  demo: "あ",
  quiz: null,
  roleplay: false,
  revealed: new Set(),
  answer: null,
  question: 0,
  finished: false,
};
let navKey = "",
  currentLesson = null,
  stageIndex = 0,
  currentTrack = "foundations",
  route = "";
let audioEpoch = 0,
  audioButton = null,
  sequence = false;
function silence() {
  audioEpoch++;
  sequence = false;
  stopAudio();
  audioButton?.classList.remove("speaking");
  audioButton = null;
  const btn = main.querySelector('[data-action="sequence"]');
  if (btn) btn.innerHTML = ic("play") + " 连续播放";
}
function soundButton(text, label = "播放日语", reading = "") {
  return (
    '<button type="button" class="sound" data-action="sound" data-text="' +
    esc(text) +
    '" data-reading="' +
    esc(reading) +
    '" aria-label="' +
    esc(label) +
    '" title="' +
    esc(label) +
    '">' +
    ic("volume") +
    "</button>"
  );
}
async function playOne(button) {
  const same = button === audioButton;
  silence();
  if (same) return;
  const epoch = audioEpoch;
  audioButton = button;
  button.classList.add("speaking");
  try {
    await speak(button.dataset.text, state.slow, button.dataset.reading);
  } catch (error) {
    if (epoch === audioEpoch) notify(error.message);
  } finally {
    if (epoch === audioEpoch) {
      button.classList.remove("speaking");
      audioButton = null;
    }
  }
}
async function playSequence(button) {
  const wasPlaying = sequence;
  silence();
  if (wasPlaying) return;
  const epoch = audioEpoch;
  sequence = true;
  button.textContent = "停止播放";
  for (const row of main.querySelectorAll(".line-row .sound")) {
    if (epoch !== audioEpoch) break;
    row.classList.add("speaking");
    audioButton = row;
    try {
      await speak(row.dataset.text, state.slow, row.dataset.reading);
    } catch (error) {
      if (epoch === audioEpoch) notify(error.message);
      break;
    } finally {
      row.classList.remove("speaking");
    }
  }
  if (epoch === audioEpoch) silence();
}
function crumb(parent, href, child) {
  return (
    '<div class="crumb"><a href="' +
    href +
    '">' +
    esc(parent) +
    "</a>" +
    ic("chevron") +
    "<span>" +
    esc(child) +
    "</span></div>"
  );
}
function lessonURL(id, stage) {
  return "#lesson/" + id + (stage === undefined ? "" : "/" + stage);
}
function courseArt(t) {
  return (
    '<a class="route" href="#courses/' +
    t.id +
    '"><span class="art-clip"><img src="' +
    imagePath(t.art) +
    '" alt="' +
    t.alt +
    '" width="960" height="480"></span><div><h3>' +
    t.name +
    " " +
    ic("arrow") +
    "</h3><p>" +
    t.description +
    "</p></div></a>"
  );
}
function nextLesson() {
  if (state.last && !state.done.includes(state.last))
    return lessonById.get(state.last);
  return lessons.find((l) => !state.done.includes(l.id)) || lessons[0];
}
function home() {
  const next = nextLesson();
  const daily = [
    { jp: "こんにちは。", zh: "你好。" },
    { jp: "すみません、駅はどこですか。", zh: "请问，车站在哪里？" },
    ...["t02", "t03", "c01"]
      .map((id) => lessonById.get(id)?.steps[0].examples[0])
      .filter(Boolean),
  ];
  const now = new Date();
  const day = Math.floor(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000,
  );
  const today = daily[day % daily.length];
  const label =
    state.done.length === lessons.length
      ? "重温第一课"
      : state.last
        ? "继续学习"
        : "开始第一课";
  return (
    '<section class="hero"><div><h1>从零开始，<br>听懂日语。</h1><p>面向旅行与动漫爱好者的日语入门学习站，从假名、基础会话到实用场景，轻松迈出第一步。</p><a class="btn primary" href="' +
    lessonURL(next.id, state.done.length === lessons.length ? 0 : undefined) +
    '">' +
    label +
    " " +
    ic("arrow") +
    '</a></div><img class="hero-art" src="' +
    imagePath("hero") +
    '" width="1800" height="666" fetchpriority="high" alt="朱红落日下，绿色电车沿着海岸驶向富士山"></section><section><div class="section-head"><h2>学习路线</h2></div><div class="routes">' +
    tracks.map(courseArt).join("") +
    '</div></section><section class="daily"><h2>今日一句</h2><span lang="ja" class="phrase">' +
    esc(today.jp) +
    "</span>" +
    soundButton(today.jp, "播放今日一句", today.kana) +
    '<span class="daily-zh">' +
    esc(today.zh) +
    "</span></section>"
  );
}
function courseView() {
  const t = tracks.find((t) => t.id === currentTrack);
  const group = lessons.filter((l) => l.track === t.id);
  return (
    '<div class="inner"><h1>课程路线</h1><p class="lead">从左到右依次学习三个篇章，也可以直接进入眼下要用的场景。</p><div class="track-tabs" aria-label="选择篇章">' +
    tracks
      .map(
        (item) =>
          '<a href="#courses/' +
          item.id +
          '" ' +
          (item === t ? 'aria-current="page"' : "") +
          ">" +
          item.name +
          "</a>",
      )
      .join("") +
    '</div><div class="track-banner"><div><h2>' +
    t.name +
    "</h2><p>" +
    t.description +
    '</p><small class="muted">已完成 ' +
    group.filter((l) => state.done.includes(l.id)).length +
    " / " +
    group.length +
    ' 课</small></div><img src="' +
    imagePath(t.art) +
    '" alt="' +
    t.alt +
    '"></div><div class="lesson-list">' +
    group
      .map(
        (l, i) =>
          '<a class="lesson-item" href="' +
          lessonURL(l.id) +
          '"><span class="lesson-no">' +
          String(i + 1).padStart(2, "0") +
          "</span><div><h3>" +
          esc(l.title) +
          "</h3><p>" +
          esc(l.goal) +
          '</p></div><span class="list-meta">' +
          (state.done.includes(l.id)
            ? '<span class="complete">' + ic("check") + " 已完成</span>"
            : "") +
          "<small>约 " +
          l.minutes +
          " 分钟</small>" +
          ic("arrow") +
          "</span></a>",
      )
      .join("") +
    "</div></div>"
  );
}
function starButton(key) {
  const saved = state.saved.includes(key);
  const label = saved ? "取消收藏" : "收藏到复习手帖";
  return (
    '<button type="button" class="star" data-action="star" data-key="' +
    esc(key) +
    '" aria-label="' +
    label +
    '" title="' +
    label +
    '" aria-pressed="' +
    saved +
    '">' +
    ic("star") +
    "</button>"
  );
}
function row(item, key, dialogue = false) {
  const read = state.readings
    ? '<p class="reading">' +
      (item.kana !== item.jp
        ? '<span lang="ja">' + esc(item.kana) + "</span> · "
        : "") +
      '<span lang="en">' +
      esc(item.romaji) +
      "</span></p>"
    : "";
  return (
    '<div class="' +
    (dialogue ? "line-row" : "example") +
    '"><div>' +
    (dialogue ? '<div class="speaker">' + esc(item.who) + "</div>" : "") +
    '<p class="jp-line" lang="ja">' +
    esc(item.jp) +
    "</p>" +
    read +
    (state.meanings ? '<p class="translation">' + esc(item.zh) + "</p>" : "") +
    '</div><div class="mini-actions">' +
    soundButton(item.jp, "播放「" + item.jp + "」", item.kana) +
    starButton(key) +
    "</div></div>"
  );
}
function controls() {
  return (
    '<div class="lesson-tools">' +
    [
      ["slow", "慢速播放"],
      ["readings", "读音提示"],
      ["meanings", "中文释义"],
    ]
      .map(
        ([key, label]) =>
          '<button class="tool" data-action="pref" data-key="' +
          key +
          '" aria-pressed="' +
          state[key] +
          '">' +
          (state[key] ? ic("check") + " " : "") +
          label +
          "</button>",
      )
      .join("") +
    "</div>"
  );
}
function strokeBoard(char, animate = true) {
  const paths = strokes[char];
  return (
    '<svg class="stroke-board" viewBox="0 0 109 109" role="img" aria-label="' +
    char +
    "，共 " +
    paths.length +
    ' 笔">' +
    paths.map((d) => '<path class="stroke-guide" d="' + d + '"/>').join("") +
    paths
      .map(
        (d, i) =>
          '<path class="stroke-ink' +
          (animate ? " drawing" : "") +
          '" d="' +
          d +
          '" pathLength="1" style="--wait:' +
          i * 0.64 +
          's"/>',
      )
      .join("") +
    "</svg>"
  );
}
function vowelDemo() {
  return (
    '<section class="practice-sample"><h3>看笔顺，跟着空写一遍</h3><div class="vowel-switch">' +
    [..."あいうえお"]
      .map(
        (c) =>
          '<button lang="ja" data-action="demo" data-char="' +
          c +
          '" aria-pressed="' +
          (session.demo === c) +
          '">' +
          c +
          "</button>",
      )
      .join("") +
    "</div>" +
    strokeBoard(session.demo) +
    '<div class="toolbar"><button class="tool" data-action="draw">' +
    ic("replay") +
    " 重播笔顺</button>" +
    soundButton(session.demo, "听这个元音") +
    "</div></section>"
  );
}
function moraDemo() {
  return (
    '<div class="practice-sample"><h3>跟着节拍读「あお」</h3><div class="toolbar"><div class="mora" lang="ja"><i style="--wait:0s">あ</i><i style="--wait:.45s">お</i></div><button class="tool" data-action="beat">' +
    ic("play") +
    " 打两拍</button>" +
    soundButton("あお", "听「あお」的完整发音") +
    "</div></div>"
  );
}
function stageTitles(lesson) {
  return [...lesson.steps.map((s) => s.title), "情景对话", "随堂练习"];
}
function manageQuiz(l) {
  if (session.quiz !== l.id) {
    Object.assign(session, {
      quiz: l.id,
      question: 0,
      answer: null,
      finished: false,
    });
  }
}
function questionView(q, i, size, selected, review = false) {
  const correct = selected === q.answer,
    touched = selected !== null;
  const action = review ? "review-answer" : "answer";
  return (
    '<p class="small-label">' +
    (review ? "错题复习" : "随堂练习") +
    " · " +
    (i + 1) +
    " / " +
    size +
    '</p><h3 class="quiz-title">' +
    esc(q.prompt) +
    "</h3>" +
    (q.listen
      ? '<div class="toolbar" style="margin-top:12px">' +
        soundButton(q.listen, "播放听力题") +
        '<span class="muted">点击听题</span></div>'
      : "") +
    '<div class="answer-set">' +
    q.options
      .map(
        (option, index) =>
          '<button data-action="' +
          action +
          '" data-index="' +
          index +
          '" class="answer ' +
          (selected === index ? (correct ? "correct" : "incorrect") : "") +
          '" ' +
          (correct ? "disabled" : "") +
          "><b>" +
          String.fromCharCode(65 + index) +
          "</b>" +
          esc(option) +
          "</button>",
      )
      .join("") +
    "</div>" +
    (touched
      ? '<div role="status" class="feedback ' +
        (correct ? "" : "error") +
        '"><strong>' +
        (correct ? "答对了。" : "再试一次。") +
        "</strong> " +
        esc(q.why) +
        "</div>"
      : "")
  );
}
function quizStage(l) {
  manageQuiz(l);
  if (session.finished) {
    const next = lessons[lessons.indexOf(l) + 1];
    return (
      '<div class="panel"><p class="complete">' +
      ic("check") +
      " 已完成本课</p><h2>" +
      esc(l.title) +
      "</h2><p>" +
      esc(l.goal) +
      '</p><div class="actions" style="margin-top:16px">' +
      (next
        ? '<a class="btn primary" href="' +
          lessonURL(next.id) +
          '">学习下一课 ' +
          ic("arrow") +
          "</a>"
        : '<a class="btn primary" href="#review">打开复习手帖</a>') +
      '<button class="tool" data-action="retry">重做练习</button></div></div>'
    );
  }
  const q = l.quiz[session.question];
  return (
    '<div class="panel">' +
    questionView(q, session.question, l.quiz.length, session.answer) +
    (session.answer === q.answer
      ? '<div class="actions" style="margin-top:15px"><button class="btn primary" data-action="advance">' +
        (session.question === l.quiz.length - 1 ? "完成本课" : "下一题") +
        " " +
        ic("arrow") +
        "</button></div>"
      : "") +
    "</div>"
  );
}
function readerStage(l) {
  const n = stageIndex;
  if (n === l.steps.length + 1) return quizStage(l);
  let content = "";
  if (n < l.steps.length) {
    const part = l.steps[n];
    content =
      "<h2>" +
      esc(part.title) +
      '</h2><p class="body-text">' +
      esc(part.body) +
      "</p>" +
      controls() +
      part.examples
        .map((item, e) => row(item, l.id + ".s" + n + "." + e))
        .join("");
    if (l.id === "f01") {
      if (n === 1 || n === 2) content += vowelDemo();
      if (n === l.steps.length - 1) content += moraDemo();
    }
  } else {
    const dialogue = l.dialogue
      .map((item, d) => {
        const key = l.id + ".d" + d;
        if (
          !session.roleplay ||
          !item.who.startsWith("你") ||
          session.revealed.has(key)
        )
          return row(item, key, true);
        return (
          '<div class="line-row prompt-row"><div><div class="speaker">' +
          esc(item.who) +
          " · 轮到你说</div><p>" +
          esc(item.zh) +
          '</p></div><button class="tool" data-action="reveal-line" data-key="' +
          key +
          '">看日语</button></div>'
        );
      })
      .join("");
    const fullPlay = session.roleplay
      ? ""
      : '<button class="tool" data-action="sequence">' +
        ic("play") +
        " 连续播放</button>";
    content =
      "<h2>情景对话</h2><p>先听完整对话，再点「我来接话」，根据中文提示说出自己的台词。</p>" +
      controls() +
      '<div class="toolbar">' +
      fullPlay +
      '<button class="tool ' +
      (session.roleplay ? "active" : "") +
      '" data-action="roleplay" aria-pressed="' +
      session.roleplay +
      '">' +
      (session.roleplay ? "返回完整对话" : "我来接话") +
      '</button></div><div style="margin-top:14px">' +
      dialogue +
      "</div>";
  }
  return (
    content +
    '<div class="stage-footer">' +
    (n > 0
      ? '<a class="text-link" href="' + lessonURL(l.id, n - 1) + '">上一步</a>'
      : "<span></span>") +
    '<a class="btn primary" href="' +
    lessonURL(l.id, n + 1) +
    '">' +
    (n === l.steps.length
      ? "进入练习"
      : n === l.steps.length - 1
        ? "进入对话"
        : "下一步") +
    " " +
    ic("arrow") +
    "</a></div>"
  );
}
function lessonView(l) {
  const t = tracks.find((t) => t.id === l.track);
  return (
    '<div class="inner">' +
    crumb(t.name, "#courses/" + t.id, "课程") +
    '<header class="reader-header"><h1>' +
    esc(l.title) +
    '</h1><p class="lead">' +
    esc(l.goal) +
    '</p><div class="meta"><span lang="ja">' +
    esc(l.jpTitle) +
    "</span><span>约 " +
    l.minutes +
    " 分钟</span>" +
    (state.done.includes(l.id)
      ? '<span class="complete">' + ic("check") + " 已完成</span>"
      : "") +
    '</div></header><div class="reader-grid"><aside class="step-nav" aria-label="本课步骤">' +
    stageTitles(l)
      .map(
        (t, i) =>
          '<button data-action="stage" data-index="' +
          i +
          '" ' +
          (stageIndex === i ? 'aria-current="step"' : "") +
          "><span>" +
          String(i + 1).padStart(2, "0") +
          "</span>" +
          esc(t) +
          "</button>",
      )
      .join("") +
    '</aside><section class="stage" id="stage" tabindex="-1">' +
    readerStage(l) +
    "</section></div></div>"
  );
}
function kanaDetail() {
  const item = allKana.find((k) => k.hira === session.kana),
    char = item[session.kanaType];
  return (
    strokeBoard(char) +
    '<h2><span lang="ja">' +
    char +
    "</span> · " +
    item.romaji +
    '</h2><div class="toolbar">' +
    soundButton(char, "听「" + char + "」的发音") +
    '<button class="tool" data-action="draw">' +
    ic("replay") +
    " 重播 " +
    strokes[char].length +
    ' 笔</button></div><p class="muted">' +
    (kanaNotes[item.hira] ||
      "听一遍这个音，再看笔顺。用手指在空中写一遍，同时轻声跟读。") +
    "</p>"
  );
}
function extraSounds() {
  const groups = [
    [
      0,
      5,
      "浊音与半浊音",
      "给清音加两点「゛」或小圈「゜」，听听起音怎样改变。",
    ],
    [
      5,
      extraKana.length,
      "常用拗音",
      "把小写的「ゃ・ゅ・ょ」与前面的假名一起读，只占一拍。",
    ],
  ];
  return groups
    .map(
      ([start, end, title, hint]) =>
        '<details class="extra-sounds"><summary>' +
        title +
        "</summary><p>" +
        hint +
        " 点字听音。</p>" +
        extraKana
          .slice(start, end)
          .map(
            (r) =>
              '<div class="extra-row"><span class="row-name">' +
              r.name +
              "</span>" +
              r.items
                .map((item) => {
                  const char = item[session.kanaType];
                  return (
                    '<button class="kana-cell" data-action="sound" data-text="' +
                    char +
                    '" aria-label="听 ' +
                    char +
                    '"><b lang="ja">' +
                    char +
                    "</b><small>" +
                    item.romaji +
                    "</small></button>"
                  );
                })
                .join("") +
              "</div>",
          )
          .join("") +
        "</details>",
    )
    .join("");
}
function kanaView() {
  return (
    '<div class="inner"><h1>五十音图</h1><p class="lead">先从第一行「あ・い・う・え・お」开始。点一个字，查看它的写法、笔顺和发音。</p><div class="toolbar">' +
    [
      ["hira", "平假名"],
      ["kata", "片假名"],
    ]
      .map(
        ([key, t]) =>
          '<button class="tool ' +
          (session.kanaType === key ? "active" : "") +
          '" data-action="script" data-type="' +
          key +
          '" aria-pressed="' +
          (session.kanaType === key) +
          '">' +
          t +
          "</button>",
      )
      .join("") +
    '</div><div class="kana-layout"><div class="kana-grid" aria-label="五十音表"><span></span>' +
    [..."aiueo"]
      .map((v) => '<span class="vowel-head">' + v + "</span>")
      .join("") +
    kanaRows
      .map(
        (r) =>
          '<span class="row-name">' +
          r.name +
          "</span>" +
          r.items
            .map((item) =>
              item
                ? '<button class="kana-cell" data-action="kana" data-char="' +
                  item.hira +
                  '" aria-pressed="' +
                  (session.kana === item.hira) +
                  '"><b lang="ja">' +
                  item[session.kanaType] +
                  "</b><small>" +
                  item.romaji +
                  "</small></button>"
                : "<span></span>",
            )
            .join(""),
      )
      .join("") +
    '</div><section class="panel kana-detail" aria-label="所选假名">' +
    kanaDetail() +
    '</section></div><p class="lead">现代基本假名各有 46 个。学完清音后，可以继续练 <a class="text-link" href="' +
    lessonURL("f06") +
    '">浊音与半浊音</a>。</p>' +
    extraSounds() +
    "</div>"
  );
}
function validMistake(key) {
  const [id, index] = key.split(":");
  return lessonById.get(id)?.quiz[Number(index)];
}
function reviewItems() {
  return session.reviewTab === "saved"
    ? state.saved.filter((key) => examples.has(key))
    : state.mistakes.filter(validMistake);
}
function sourceLesson(key) {
  const [id, section] = key.split(".");
  const target = section.startsWith("s")
    ? Number(section.slice(1))
    : lessonById.get(id).steps.length;
  return lessonURL(id, target);
}
function reviewPanel() {
  const saved = session.reviewTab === "saved",
    items = reviewItems();
  if (!items.length)
    return (
      '<div class="panel empty"><h2>' +
      (saved ? "还没有收藏的表达" : "目前没有待复习的错题") +
      "</h2><p>" +
      (saved
        ? "在课文或对话旁点星标，回到这里看日语、猜中文，再翻卡核对。"
        : "随堂练习中答错的题会收在这里。重新答对一次，就可以从错题本移除。") +
      '</p><p style="margin-top:15px"><a class="text-link" href="#courses">去课程路线 ' +
      ic("arrow") +
      "</a></p></div>"
    );
  session.reviewIndex = Math.min(
    Math.max(session.reviewIndex, 0),
    items.length - 1,
  );
  const i = session.reviewIndex,
    key = items[i];
  if (!saved) {
    const q = validMistake(key);
    return (
      '<div class="panel review-card">' +
      questionView(q, i, items.length, session.reviewAnswer, true) +
      '<div class="actions">' +
      (session.reviewAnswer === q.answer
        ? '<button class="btn primary" data-action="mastered">已掌握，移出错题本</button>'
        : "") +
      '<a class="text-link" href="' +
      lessonURL(key.split(":")[0], 0) +
      '">回看本课</a></div></div>' +
      pager(items.length)
    );
  }
  const item = examples.get(key);
  return (
    '<div class="panel review-card"><p class="small-label">收藏卡片 · ' +
    (i + 1) +
    " / " +
    items.length +
    '</p><div class="toolbar"><h2 class="jp-line" lang="ja">' +
    esc(item.jp) +
    "</h2>" +
    soundButton(item.jp, "播放收藏的表达", item.kana) +
    '</div><div class="flashface">' +
    (session.flipped
      ? '<p class="reading"><span lang="ja">' +
        esc(item.kana) +
        "</span> · " +
        esc(item.romaji) +
        "</p><p>" +
        esc(item.zh) +
        "</p>"
      : '<p class="muted">试着读出这句日语，想一想它的意思。</p>') +
    '</div><div class="actions"><button class="btn primary" data-action="flip">' +
    (session.flipped ? "收起释义" : "翻卡看释义") +
    '</button><button class="tool" data-action="remove-saved" data-key="' +
    esc(key) +
    '">移出收藏</button><a class="text-link" href="' +
    sourceLesson(key) +
    '">回看本课</a></div></div>' +
    pager(items.length)
  );
}
function pager(count) {
  return count < 2
    ? ""
    : '<div class="stage-footer"><button class="tool" data-action="page" data-offset="-1" ' +
        (session.reviewIndex === 0 ? "disabled" : "") +
        '>上一张</button><button class="tool" data-action="page" data-offset="1" ' +
        (session.reviewIndex === count - 1 ? "disabled" : "") +
        ">下一张</button></div>";
}
function reviewView() {
  return (
    '<div class="inner narrow"><h1>复习手帖</h1><p class="lead">收藏的表达和曾经答错的题都收在这里。学习记录保存在当前浏览器。</p><p class="meta">课程进度 ' +
    state.done.filter((id) => lessonById.has(id)).length +
    " / " +
    lessons.length +
    '</p><div class="toolbar review-tabs">' +
    [
      ["saved", "收藏表达", state.saved.filter((k) => examples.has(k)).length],
      ["mistakes", "错题本", state.mistakes.filter(validMistake).length],
    ]
      .map(
        ([k, label, count]) =>
          '<button data-action="review-tab" data-type="' +
          k +
          '" aria-pressed="' +
          (session.reviewTab === k) +
          '" class="tool ' +
          (session.reviewTab === k ? "active" : "") +
          '">' +
          label +
          "（" +
          count +
          "）</button>",
      )
      .join("") +
    '</div><div id="review-panel">' +
    reviewPanel() +
    "</div></div>"
  );
}
function about() {
  return (
    '<div class="inner narrow"><h1>教材与素材来源</h1><p class="lead">日和手帖为中文零基础学习者编写。课程采用原创中文讲解、例句、情景对话和练习题。以下官方资源可供延伸学习。</p><div class="bibliography">' +
    references
      .map(
        (r) =>
          '<article><h3><a href="' +
          esc(r.url) +
          '" target="_blank" rel="noopener">' +
          esc(r.name) +
          " ↗</a></h3><p>" +
          esc(r.note) +
          "</p></article>",
      )
      .join("") +
    '</div><div class="section-head"><h2>笔顺、语音与插画</h2></div><div class="bibliography"><article><h3>假名笔顺</h3><p>笔画数据取自 Ulrich Apel 的 <a href="https://kanjivg.tagaini.net/">KanjiVG</a>。本站提取了 92 个假名的笔画路径并制作逐笔动画，衍生路径沿用 <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>。</p></article><article><h3>日语朗读</h3><p>使用 Open JTalk 和 Mei 声库生成教学音频。慢速播放保留音高。</p><p><a href="https://github.com/haoyunLi/nihongo-biyori/blob/main/assets/audio/CREDITS.md">语音来源与许可 ↗</a></p></article><article><h3>视觉素材</h3><p>海滨电车与三幅课程封面为本站生成的原创插画。中文标题使用 Noto Serif SC 的嵌入子集。<a href="./assets/fonts/OFL.txt">字体许可</a></p></article></div></div>'
  );
}
function go() {
  if (location.hash === "#main") {
    main.focus();
    return;
  }
  silence();
  const [raw, arg, num] = location.hash.slice(1).split("/");
  route = raw || "home";
  if (route === "lesson" && !lessonById.has(arg)) route = "missing";
  const sameLesson = route === "lesson" && navKey === arg;
  navKey = route === "lesson" ? arg : route;
  currentLesson = route === "lesson" ? lessonById.get(arg) : null;
  if (currentLesson) {
    const stored = Number(state.positions[arg]) || 0;
    stageIndex = Math.min(
      currentLesson.steps.length + 1,
      Math.max(
        0,
        num !== undefined && /^\d+$/.test(num)
          ? Number(num)
          : Math.trunc(stored),
      ),
    );
    if (!sameLesson || stageIndex !== currentLesson.steps.length + 1)
      session.quiz = null;
    if (!sameLesson || stageIndex !== currentLesson.steps.length) {
      session.roleplay = false;
      session.revealed.clear();
    }
    state.last = arg;
    state.positions[arg] = stageIndex;
    save();
  }
  currentTrack = tracks.some((t) => t.id === arg) ? arg : "foundations";
  const view = {
    home,
    courses: courseView,
    kana: kanaView,
    lesson: () => lessonView(currentLesson),
    review: reviewView,
    about,
  };
  main.innerHTML = Object.hasOwn(view, route)
    ? view[route]()
    : '<div class="inner"><h1>没有找到这一页</h1><p class="lead"><a class="text-link" href="#home">返回学习首页</a></p></div>';
  const active = route === "lesson" ? "courses" : route;
  document.querySelectorAll("nav a").forEach((a) => {
    if (a.hash === "#" + active) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  const title =
    currentLesson?.title ||
    {
      home: "从零开始学日语",
      courses: "课程路线",
      kana: "五十音图",
      review: "复习手帖",
      about: "教材与素材来源",
    }[route] ||
    "页面未找到";
  document.title = title + " · 日和手帖";
  if (sameLesson) {
    const step = main.querySelector('[aria-current="step"]');
    if (step && innerWidth <= 650)
      step.parentElement.scrollLeft =
        step.offsetLeft - step.parentElement.offsetLeft - 12;
    main.querySelector("#stage")?.focus({ preventScroll: true });
  } else {
    main.focus({ preventScroll: true });
  }
  window.scrollTo({ top: 0, behavior: "instant" });
}
function rerenderStage() {
  silence();
  document.querySelector("#stage").innerHTML = readerStage(currentLesson);
}
function rerenderReview() {
  silence();
  main.innerHTML = reviewView();
}
function removeEntry(list, key) {
  return list.filter((entry) => entry !== key);
}
function markAnswer(index, review) {
  const l = currentLesson;
  const key = review
    ? reviewItems()[session.reviewIndex]
    : l.id + ":" + session.question;
  const q = review ? validMistake(key) : l.quiz[session.question];
  if (!q || index < 0 || index >= q.options.length) return;
  if (review) {
    session.reviewAnswer = index;
    rerenderReview();
  } else {
    session.answer = index;
    if (index !== q.answer && !state.mistakes.includes(key)) {
      state.mistakes.push(key);
      save();
    }
    rerenderStage();
  }
  main
    .querySelector(".feedback")
    ?.scrollIntoView({ block: "nearest", behavior: "instant" });
}
function updateKana(button, changeScript) {
  silence();
  if (changeScript) session.kanaType = button.dataset.type;
  else session.kana = button.dataset.char;
  const oldTop = window.scrollY;
  main.innerHTML = kanaView();
  const selector = changeScript
    ? '[data-action="script"][aria-pressed="true"]'
    : '[data-action="kana"][aria-pressed="true"]';
  main.querySelector(selector)?.focus({ preventScroll: true });
  if (!changeScript && innerWidth <= 650)
    main
      .querySelector(".kana-detail")
      .scrollIntoView({ block: "nearest", behavior: "instant" });
  else window.scrollTo({ top: oldTop, behavior: "instant" });
}
main.addEventListener("click", (e) => {
  const button = e.target.closest("button[data-action]");
  if (!button) return;
  const { action, key } = button.dataset;
  switch (action) {
    case "sound":
      void playOne(button);
      break;
    case "sequence":
      void playSequence(button);
      break;
    case "roleplay":
      session.roleplay = !session.roleplay;
      session.revealed.clear();
      rerenderStage();
      break;
    case "reveal-line":
      session.revealed.add(key);
      rerenderStage();
      break;
    case "star":
      if (state.saved.includes(key))
        state.saved = removeEntry(state.saved, key);
      else state.saved.push(key);
      save();
      button.outerHTML = starButton(key);
      main
        .querySelector('[data-action="star"][data-key="' + key + '"]')
        ?.focus({ preventScroll: true });
      notify(
        state.saved.includes(key) ? "已收进复习手帖。" : "已移出复习手帖。",
      );
      break;
    case "stage":
      location.hash = lessonURL(currentLesson.id, Number(button.dataset.index));
      break;
    case "pref":
      if (["slow", "readings", "meanings"].includes(key)) {
        state[key] = !state[key];
        save();
        rerenderStage();
        main
          .querySelector('[data-key="' + key + '"]')
          ?.focus({ preventScroll: true });
      }
      break;
    case "demo":
      session.demo = button.dataset.char;
      main.querySelector(".practice-sample").outerHTML = vowelDemo();
      main
        .querySelector('[data-action="demo"][aria-pressed="true"]')
        ?.focus({ preventScroll: true });
      break;
    case "draw": {
      const board = button
        .closest(".practice-sample,.kana-detail")
        .querySelector(".stroke-board");
      const char = button.closest(".kana-detail")
        ? allKana.find((k) => k.hira === session.kana)[session.kanaType]
        : session.demo;
      board.outerHTML = strokeBoard(char);
      break;
    }
    case "beat": {
      const bar = button.closest(".practice-sample").querySelector(".mora");
      bar.classList.remove("playing");
      void bar.offsetWidth;
      bar.classList.add("playing");
      break;
    }
    case "script":
      updateKana(button, true);
      break;
    case "kana":
      updateKana(button, false);
      break;
    case "answer":
      markAnswer(Number(button.dataset.index), false);
      break;
    case "advance":
      if (session.answer !== currentLesson.quiz[session.question].answer) break;
      if (session.question === currentLesson.quiz.length - 1) {
        session.finished = true;
        if (!state.done.includes(currentLesson.id))
          state.done.push(currentLesson.id);
        save();
      } else session.question++;
      session.answer = null;
      rerenderStage();
      break;
    case "retry":
      session.quiz = null;
      rerenderStage();
      break;
    case "review-tab":
      Object.assign(session, {
        reviewTab: button.dataset.type,
        reviewIndex: 0,
        flipped: false,
        reviewAnswer: null,
      });
      rerenderReview();
      break;
    case "page":
      session.reviewIndex += Number(button.dataset.offset);
      session.flipped = false;
      session.reviewAnswer = null;
      rerenderReview();
      break;
    case "flip":
      session.flipped = !session.flipped;
      rerenderReview();
      break;
    case "remove-saved":
      state.saved = removeEntry(state.saved, key);
      session.flipped = false;
      save();
      rerenderReview();
      break;
    case "review-answer":
      markAnswer(Number(button.dataset.index), true);
      break;
    case "mastered": {
      const entry = reviewItems()[session.reviewIndex];
      if (session.reviewAnswer !== validMistake(entry)?.answer) break;
      state.mistakes = removeEntry(state.mistakes, entry);
      session.reviewAnswer = null;
      save();
      rerenderReview();
      break;
    }
  }
});
document.querySelector(".skip").addEventListener("click", (e) => {
  e.preventDefault();
  main.focus();
});
window.addEventListener("hashchange", go);
go();
