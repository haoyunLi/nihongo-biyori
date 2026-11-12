import { guideById, kanaGuides } from "./kana-guides.js";
import { kanaNotes } from "./kana.js";
import { strokes } from "./strokes.js?v=3";
import { speak } from "./audio.js?v=9";
import { humanKana, humanWords } from "./assets/audio/catalog.js?v=3";

const stages = [
  ["listen", "听音与笔顺"],
  ["words", "情景词练习"],
  ["check", "听辨自测"],
];
const human = new Set(humanKana);
const recordedWords = new Set(humanWords);
const rowState = {
  guide: null,
  stage: "listen",
  script: "hira",
  letter: 0,
  word: 0,
  quiz: [],
  question: 0,
  answer: null,
  passed: false,
};
let run = 0,
  playing = null,
  finishPause = null;
const pause = (ms) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => finishPause?.(), ms);
    finishPause = () => {
      clearTimeout(timer);
      finishPause = null;
      resolve();
    };
  });

export function stopGuidePlayback() {
  run++;
  finishPause?.();
  if (playing?.isConnected) {
    playing.textContent = playing.dataset.idle;
    playing.setAttribute("aria-pressed", "false");
  }
  if (playing) status("");
  playing = null;
}
export function guideURL(id, part = "listen", script = "hira") {
  const tail =
    script === "kata"
      ? "/" + part + "/kata"
      : part === "listen"
        ? ""
        : "/" + part;
  return "#kana/" + id + tail;
}
export function strokeBoard(chars, animate = true) {
  const letters = [...chars];
  let pos = 0;
  const paths = letters
    .map((c, i) => {
      const draw = strokes[c]
        .map((d) => {
          const delay = (pos++ * 0.64).toFixed(2);
          return (
            '<path class="stroke-ink' +
            (animate ? " drawing" : "") +
            '" d="' +
            d +
            '" pathLength="1" style="--wait:' +
            delay +
            's"/>'
          );
        })
        .join("");
      const guide = strokes[c]
        .map((d) => '<path class="stroke-guide" d="' + d + '"/>')
        .join("");
      return (
        '<g transform="translate(' + i * 109 + ' 0)">' + guide + draw + "</g>"
      );
    })
    .join("");
  return (
    '<svg class="stroke-board' +
    (letters.length > 1 ? " pair" : "") +
    '" viewBox="0 0 ' +
    letters.length * 109 +
    ' 109" role="img" aria-label="' +
    chars +
    "，共 " +
    pos +
    ' 笔">' +
    paths +
    "</svg>"
  );
}
function status(msg) {
  const el = document.querySelector(".guide-status");
  if (el) el.textContent = msg;
}
function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function makeQuiz(guide) {
  const item = shuffled(guide.items)[0],
    word = shuffled(guide.words)[0];
  const otherSounds = [...guide.items, ...kanaGuides[0].items].filter(
    (x) => x.romaji !== item.romaji,
  );
  const others = [...new Set(otherSounds.map((x) => x.hira))];
  const distractors = [
    ...new Set([...guide.words, ...kanaGuides[0].words].map((w) => w.zh)),
  ].filter((w) => w !== word.zh);
  return [
    {
      prompt: "听一个音，选出对应的假名。",
      audio: item.hira,
      answer: item.hira,
      choices: shuffled([item.hira, ...shuffled(others).slice(0, 2)]),
      why:
        "这个音写作「" +
        item.hira +
        "／" +
        item.kata +
        "」，罗马字是 " +
        item.romaji +
        "。",
      glyphs: true,
    },
    {
      prompt: "听这个词，选出它在场景中的意思。",
      audio: word.jp,
      answer: word.zh,
      choices: shuffled([word.zh, ...shuffled(distractors).slice(0, 2)]),
      why:
        "「" +
        word.jp +
        "」读作「" +
        word.beats.join("・") +
        "」。" +
        word.scene,
    },
  ];
}
function asScript(s) {
  if (rowState.script === "hira") return s;
  return [...s]
    .map((c) =>
      /[ぁ-ゖ]/u.test(c) ? String.fromCodePoint(c.codePointAt(0) + 96) : c,
    )
    .join("");
}
function localURL(stage) {
  return guideURL(rowState.guide.id, stage, rowState.script);
}
function toggle(label, action, extra = "") {
  return (
    '<button class="tool" data-action="' +
    action +
    '" ' +
    extra +
    ">" +
    label +
    "</button>"
  );
}
function symbols() {
  return rowState.guide.items
    .map(
      (x, i) =>
        '<button class="guide-symbol" lang="ja" data-action="guide-letter" data-index="' +
        i +
        '" aria-pressed="' +
        (i === rowState.letter) +
        '"><b>' +
        x[rowState.script] +
        "</b><small>" +
        x.romaji +
        "</small></button>",
    )
    .join("");
}
function selectedLetter(ctx) {
  const item = rowState.guide.items[rowState.letter],
    c = item[rowState.script];
  const note =
    kanaNotes[item.hira] ||
    (item.hira.length === 2
      ? "先空写左边的大字，再写右边的小字。发音时合成一拍。"
      : "边看动画边用手指空写。写到最后一笔，再把这个音完整说一遍。");
  return (
    '<div class="guide-board">' +
    strokeBoard(c) +
    '</div><div class="guide-letter-info"><p class="small-label">' +
    (rowState.letter + 1) +
    " / " +
    rowState.guide.items.length +
    ' 个音</p><h2><span lang="ja">' +
    c +
    "</span> <small>" +
    item.romaji +
    "</small></h2><p>" +
    note +
    '</p><p class="reading">平假名 <span lang="ja">' +
    item.hira +
    '</span> · 片假名 <span lang="ja">' +
    item.kata +
    '</span></p><div class="toolbar">' +
    ctx.soundButton(c, "听「" + c + "」的示范") +
    '<span class="reading">' +
    (human.has(item.kata) ? "真人示范" : "合成示范") +
    "</span>" +
    ctx.recordButton({ jp: c, tip: note, compact: true }) +
    toggle("重播笔顺", "guide-draw") +
    toggle("逐笔看", "guide-stroke") +
    '</div><small class="stroke-count" role="status"></small></div>'
  );
}
function speed(ctx) {
  return toggle(
    ctx.slow() ? "慢速播放 ✓" : "慢速播放",
    "guide-slow",
    'aria-pressed="' + ctx.slow() + '"',
  );
}
function playbackButton(text, action) {
  return (
    '<button class="btn primary" data-action="' +
    action +
    '" data-idle="' +
    text +
    '" aria-pressed="false">' +
    text +
    "</button>"
  );
}
function listenView(ctx) {
  const { guide, script } = rowState;
  return (
    '<div class="guide-sheet"><h2>' +
    guide.focus +
    "</h2><p>" +
    guide.tip +
    '</p><div class="guide-controls"><div class="toolbar">' +
    [
      ["hira", "平假名"],
      ["kata", "片假名"],
    ]
      .map(
        ([s, label]) =>
          '<a class="tool ' +
          (s === script ? "active" : "") +
          '" href="' +
          guideURL(guide.id, "listen", s) +
          '" ' +
          (s === script ? 'aria-current="true"' : "") +
          ">" +
          label +
          "</a>",
      )
      .join("") +
    "</div>" +
    speed(ctx) +
    '</div><div class="guide-symbols" aria-label="选择本行的音">' +
    symbols() +
    '</div><div class="guide-selected">' +
    selectedLetter(ctx) +
    '</div><div class="toolbar">' +
    playbackButton("带我跟读整行", "guide-shadow-row") +
    '<span class="reading">每个音播放一次，然后停下来等你跟读。</span></div><p class="guide-status" role="status"></p></div><div class="stage-footer"><a href="#kana" class="text-link">返回音图</a><a class="btn primary" href="' +
    localURL("words") +
    '">用词练这一行 →</a></div>'
  );
}
function currentWord(ctx) {
  const { guide, word: index } = rowState,
    w = guide.words[index];
  const focus = new Set(guide.items.map((i) => i.hira));
  return (
    '<p class="small-label">情景词 ' +
    (index + 1) +
    " / " +
    guide.words.length +
    '</p><h2 lang="ja">' +
    w.jp +
    "</h2><p>" +
    w.zh +
    '</p><p class="reading" lang="en">' +
    w.romaji +
    '</p><div class="word-beats" aria-label="按拍拆读">' +
    w.beats
      .map(
        (b) =>
          '<span lang="ja" class="' +
          (focus.has(b) ? "target" : "") +
          '">' +
          b +
          "</span>",
      )
      .join("") +
    '</div><p class="reading">每格一拍，朱红色是这一行的音。</p><p class="word-scene">' +
    w.scene +
    '</p><div class="toolbar">' +
    ctx.soundButton(w.jp, "听「" + w.jp + "」") +
    '<span class="reading">' +
    (recordedWords.has(w.jp) ? "真人词汇示范" : "日语合成示范") +
    "</span>" +
    playbackButton("听一句，跟一句", "guide-shadow-word") +
    ctx.recordButton({
      jp: w.jp,
      kana: w.beats.join(""),
      zh: w.zh,
      tip:
        "边听边敲 " +
        w.beats.length +
        " 拍。再录一遍，回听自己在哪一拍变换了口形。",
    }) +
    speed(ctx) +
    '</div><p class="guide-status" role="status"></p>'
  );
}
function wordsView(ctx) {
  const { guide, word: index } = rowState;
  return (
    '<div class="guide-sheet"><h2>在场景词里读这一行</h2><p>先听完整的词，再看每一拍。跟读后会再播一次，方便你对照。</p><div class="guide-word-tabs">' +
    guide.words
      .map(
        (w, i) =>
          '<button class="tool" data-action="guide-word" data-index="' +
          i +
          '" aria-pressed="' +
          (index === i) +
          '"><span lang="ja">' +
          w.jp +
          "</span></button>",
      )
      .join("") +
    '</div><section class="word-practice">' +
    currentWord(ctx) +
    '</section></div><div class="stage-footer"><a class="text-link" href="' +
    localURL("listen") +
    '">回看笔顺</a><a class="btn primary" href="' +
    localURL("check") +
    '">试试听辨 →</a></div>'
  );
}
function checkView(ctx) {
  const { guide, quiz, question, answer, passed } = rowState;
  if (passed) {
    const next = kanaGuides[kanaGuides.indexOf(guide) + 1];
    return (
      '<div class="guide-sheet"><p class="complete">✓ 本行已练完</p><h2>你已经听出了' +
      guide.title +
      '的音和词</h2><div class="toolbar">' +
      (next
        ? '<a class="btn primary" href="' +
          guideURL(next.id, "listen", rowState.script) +
          '">接着练 ' +
          next.title +
          " →</a>"
        : '<a class="btn primary" href="#courses/travel">去旅行篇运用 →</a>') +
      toggle("再测一次", "guide-reset") +
      '<a class="text-link" href="#practice/daily">加入混合复习 →</a>' +
      "</div></div>"
    );
  }
  const q = quiz[question],
    correct = q.answer === answer;
  return (
    '<div class="guide-sheet"><p class="small-label">听辨自测 · ' +
    (question + 1) +
    " / " +
    quiz.length +
    "</p><h2>" +
    q.prompt +
    '</h2><div class="toolbar">' +
    ctx.soundButton(q.audio, "播放本题声音") +
    speed(ctx) +
    '</div><div class="answer-set">' +
    q.choices
      .map(
        (val, i) =>
          '<button class="answer ' +
          (answer === val ? (correct ? "correct" : "incorrect") : "") +
          '" data-action="guide-answer" data-index="' +
          i +
          '" ' +
          (correct ? "disabled" : "") +
          "><b>" +
          String.fromCharCode(65 + i) +
          "</b><span " +
          (q.glyphs ? 'lang="ja"' : "") +
          ">" +
          (q.glyphs ? asScript(val) : val) +
          "</span></button>",
      )
      .join("") +
    "</div>" +
    (answer === null
      ? ""
      : '<p class="feedback ' +
        (correct ? "" : "error") +
        '" role="status">' +
        (correct
          ? "答对了。" + q.why
          : "这个音或词已记入待复习内容。再听一遍，试试另一个答案。") +
        "</p>") +
    (correct
      ? '<button class="btn primary" data-action="guide-next-question">' +
        (question === 0 ? "下一题" : "完成这一行") +
        "</button>"
      : "") +
    '</div><p><a class="text-link" href="' +
    localURL("words") +
    '">回到情景词</a></p>'
  );
}
function panel(ctx) {
  if (rowState.stage === "listen") return listenView(ctx);
  if (rowState.stage === "words") return wordsView(ctx);
  return checkView(ctx);
}
function redraw(ctx, focusSelector) {
  const el = document.querySelector("#guide-panel");
  el.innerHTML = panel(ctx);
  if (focusSelector)
    el.querySelector(focusSelector)?.focus({ preventScroll: true });
}
export function guideView(id, part, script, ctx) {
  const guide = guideById.get(id);
  const stage = stages.some(([s]) => s === part) ? part : "listen";
  if (rowState.guide !== guide) {
    Object.assign(rowState, {
      guide,
      letter: 0,
      word: 0,
      quiz: [],
      passed: false,
      answer: null,
      question: 0,
    });
  }
  if (stage === "check" && !rowState.quiz.length)
    rowState.quiz = makeQuiz(guide);
  rowState.stage = stage;
  rowState.script = script === "kata" ? "kata" : "hira";
  const i = kanaGuides.indexOf(guide);
  return (
    '<div class="inner guide-reader"><div class="crumb"><a href="#kana">五十音图</a><span>›</span>逐行跟练</div><div class="guide-head"><div><h1>' +
    guide.title +
    '</h1><p class="lead" lang="ja">' +
    guide.items.map((x) => x[rowState.script]).join("・") +
    "</p></div><label>换一行 <select data-guide-select>" +
    kanaGuides
      .map(
        (g, j) =>
          '<option value="' +
          g.id +
          '" ' +
          (i === j ? "selected" : "") +
          ">" +
          g.title +
          "</option>",
      )
      .join("") +
    '</select></label></div><div class="track-tabs guide-tabs" aria-label="本行三个步骤">' +
    stages
      .map(
        ([s, name], i) =>
          '<a href="' +
          localURL(s) +
          '" ' +
          (s === stage ? 'aria-current="step"' : "") +
          ">" +
          (i + 1) +
          ". " +
          name +
          "</a>",
      )
      .join("") +
    '</div><section id="guide-panel">' +
    panel(ctx) +
    "</section>" +
    ctx.returnLink() +
    "</div>"
  );
}
export function changeGuideRow(id) {
  if (guideById.has(id))
    location.hash = guideURL(id, "listen", rowState.script);
}
function updateLetter(ctx, index) {
  rowState.letter = index;
  document
    .querySelectorAll(".guide-symbol")
    .forEach((el, i) => el.setAttribute("aria-pressed", String(i === index)));
  document.querySelector(".guide-selected").innerHTML = selectedLetter(ctx);
}
async function shadow(button, ctx, wholeRow) {
  const wasPlaying = playing === button;
  ctx.silence();
  if (wasPlaying) return;
  playing = button;
  const ticket = run,
    current = () => ticket === run;
  button.textContent = "停止跟读";
  button.setAttribute("aria-pressed", "true");
  const { guide, script } = rowState;
  const items = wholeRow
    ? guide.items.map((item) => item[script])
    : [guide.words[rowState.word].jp];
  try {
    for (const [i, text] of items.entries()) {
      if (!current()) return;
      const started = performance.now();
      if (wholeRow) updateLetter(ctx, i);
      status("先听「" + text + "」");
      await speak(text, ctx.slow());
      if (!current()) return;
      status("轮到你读「" + text + "」");
      const wait = wholeRow
        ? Math.max(
            1900,
            [...text].reduce((ms, c) => ms + strokes[c].length * 640, 350) -
              (performance.now() - started),
          )
        : Math.max(2200, guide.words[rowState.word].beats.length * 480);
      await pause(wait);
      if (!current()) return;
      if (!wholeRow) {
        status("再听一次，对照自己的读音。");
        await speak(text, ctx.slow());
      }
    }
    if (current()) {
      ctx.silence();
      status(
        wholeRow
          ? "整行跟读结束。可以进入情景词练习。"
          : "跟读结束。换一个词再练。",
      );
    }
  } catch (err) {
    if (current()) {
      ctx.silence();
      ctx.notify(err.message);
    }
  }
}
export function handleGuide(button, ctx) {
  const { action, index } = button.dataset;
  if (action === "guide-shadow-row" || action === "guide-shadow-word") {
    void shadow(button, ctx, action === "guide-shadow-row");
    return;
  }
  ctx.silence();
  switch (action) {
    case "guide-letter":
      updateLetter(ctx, Number(index));
      break;
    case "guide-word":
      rowState.word = Number(index);
      redraw(ctx, '[data-action="guide-word"][aria-pressed="true"]');
      break;
    case "guide-draw":
    case "guide-stroke": {
      const board = document.querySelector(".guide-board");
      const char = rowState.guide.items[rowState.letter][rowState.script];
      const manual = action === "guide-stroke";
      board.innerHTML = strokeBoard(char, !manual);
      const ink = [...board.querySelectorAll(".stroke-ink")];
      const step = manual
        ? (Number(board.dataset.strokeStep || 0) % ink.length) + 1
        : 0;
      board.dataset.strokeStep = String(step);
      document.querySelector(".stroke-count").textContent = manual
        ? "第 " + step + " 笔，共 " + ink.length + " 笔。朱红色显示这一笔。"
        : "";
      if (manual)
        ink.forEach((path, i) => {
          if (i >= step) path.style.visibility = "hidden";
          if (i === step - 1) {
            path.classList.add("drawing", "current-stroke");
            path.style.setProperty("--wait", "0s");
          }
        });
      break;
    }
    case "guide-slow":
      ctx.setSlow(!ctx.slow());
      redraw(ctx, '[data-action="guide-slow"]');
      break;
    case "guide-answer": {
      const q = rowState.quiz[rowState.question];
      rowState.answer = q.choices[Number(index)];
      if (rowState.answer !== q.answer)
        ctx.flagMiss(
          q.glyphs
            ? "kana:" + q.audio
            : "word:" + rowState.guide.id + ":" + q.audio,
        );
      redraw(
        ctx,
        rowState.answer === q.answer
          ? '[data-action="guide-next-question"]'
          : '[data-action="guide-answer"][data-index="' + index + '"]',
      );
      break;
    }
    case "guide-next-question":
      if (rowState.answer !== rowState.quiz[rowState.question].answer) return;
      if (rowState.question === rowState.quiz.length - 1) {
        rowState.passed = true;
        ctx.complete(rowState.guide.id);
      } else rowState.question++;
      rowState.answer = null;
      redraw(ctx, rowState.passed ? "a.primary" : "button.sound");
      break;
    case "guide-reset":
      Object.assign(rowState, {
        question: 0,
        passed: false,
        answer: null,
        quiz: makeQuiz(rowState.guide),
      });
      redraw(ctx, "button.sound");
      break;
  }
}
