import {
  dailyLimit,
  flagListeningMiss,
  dayLabel,
  localDay,
  matchesRomaji,
  newRound,
  pendingCard,
  planDay,
  readBook,
  recallCards,
  recordRating,
  updateBook,
} from "./recall.js";
import { scenes, sceneById, chunkReading } from "./scenes.js";

const catalog = new Map();
let drill = null;
let feedback = null;
let session = null;

export function createPractice(ctx) {
  for (const [key, item] of ctx.examples) {
    const id = key.split(".")[0] + "/" + item.jp;
    if (!catalog.has(id)) catalog.set(id, { key, item });
  }
  function word(scene, jp) {
    return catalog.get(scene.id + "/" + jp);
  }
  function snap() {
    const book = readBook(),
      day = localDay();
    const plan = planDay(ctx.state, book.history, day);
    const round = book.round?.day === day ? book.round : newRound(day, plan);
    return { book, day, plan, round, pending: pendingCard(round) };
  }
  function sceneList() {
    return scenes
      .map(
        (scene) =>
          `<a class="scene-link" href="#practice/scene/${scene.id}"><span>${scene.place}</span><strong>${scene.title}</strong><span aria-hidden="true">→</span></a>`,
      )
      .join("");
  }
  function entry() {
    const { round, pending, plan } = snap();
    let note = "今天没有到期卡";
    if (round.ids.length)
      note = pending
        ? "今日进度 " +
          Object.keys(round.first).length +
          " / " +
          round.ids.length +
          " 张"
        : "本日复习已完成";
    else if (plan.nextDue) note = "下次复习 " + dayLabel(plan.nextDue);
    if (pending?.phase === "retry")
      note =
        "待重练 " +
        round.ids.filter(
          (id) => round.first[id] === "again" && !round.retry[id],
        ).length +
        " 张";
    return `<div class="practice-entry"><div><h2>练习室</h2><p>${note} · 自己回想，再听示范</p></div><div class="actions"><a class="btn" href="#practice/daily">今日复习</a><a class="btn" href="#practice">情景接话</a></div></div>`;
  }
  function hub() {
    const { round, pending, plan } = snap();
    let desc = round.warmup
      ? "先用五个元音热身。学完课或收藏表达后，会练到你自己的内容。"
      : "从已学假名、学过的表达、收藏和错题中选卡。先尝试回想，再对照示范。";
    if (!pending && round.ids.length)
      desc = "今天的一轮已经完成。可以查看每张卡下次复习的日期。";
    if (!round.ids.length && plan.nextDue)
      desc =
        "下一次复习在 " +
        dayLabel(plan.nextDue) +
        "。现在可以选一个场景练接话。";
    return `<div class="inner narrow"><h1>练习室</h1><section class="practice-feature"><h2>今日复习</h2><p>${desc}</p><a class="btn primary" href="#practice/daily">${pending ? "进入复习 · " + round.ids.length + " 张" : "查看复习安排"} →</a></section><div class="section-head"><h2>情景接话</h2></div><p class="scene-intro">选一个你想去的地方。听对方说话，再用打乱的日语语块拼出自己的回应。</p><div class="scene-list">${sceneList()}</div></div>`;
  }
  function crumbs(current) {
    return `<div class="crumb"><a href="#practice">练习室</a><span aria-hidden="true">›</span>${current}</div>`;
  }
  function displayCard(card) {
    return ctx.esc(
      card.kind === "kana"
        ? card.item.hira
        : card.kind === "say" || card.kind === "word"
          ? card.item.jp
          : card.q.prompt,
    );
  }
  function summary(round, book) {
    const firstOK = Object.values(round.first).filter((x) => x === "ok").length;
    const rows = round.ids
      .map((id) => {
        const card = recallCards.get(id);
        const status =
          round.first[id] === "ok"
            ? "首次想起"
            : round.retry[id] === "ok"
              ? "重练后想起"
              : "还需巩固";
        return `<li><a href="${card.source}">${displayCard(card)}</a><span>${status} · ${dayLabel(book.history[id].due)} 再练</span></li>`;
      })
      .join("");
    return `<section class="practice-sheet"><p class="complete">今日复习完成</p><h2>${round.ids.length} 张卡中，有 ${firstOK} 张第一次就想起来了</h2><ul class="recall-results">${rows}</ul><a class="btn primary" href="#practice">去选一个情景接话 →</a></section>`;
  }
  function dialogAnswer(card) {
    const v = card.item;
    return `<div class="model-line"><strong lang="ja">${ctx.esc(v.jp)}</strong>${ctx.soundButton(v.jp, "听示范", v.kana)}</div><p class="reading"><span lang="ja">${ctx.esc(v.kana)}</span> · ${ctx.esc(v.romaji)}</p>`;
  }
  function explanation(card) {
    if (card.kind === "say") return dialogAnswer(card);
    if (card.kind === "word")
      return dialogAnswer(card) + "<p>" + ctx.esc(card.item.zh) + "</p>";
    if (card.kind === "mistake") {
      const q = card.q;
      return `<p><strong>${ctx.esc(q.options[q.answer])}</strong></p><p>${ctx.esc(q.why)}</p>${q.listen ? ctx.soundButton(q.listen, "重听题目") : ""}`;
    }
    const v = card.item;
    return `<div class="model-line"><strong lang="ja">${v.hira} ／ ${v.kata}</strong> ${ctx.soundButton(v.hira, "听假名原音")}</div><p>读作 <b>${v.romaji}</b>。</p>`;
  }
  function cardQuestion(card, book) {
    if (card.kind === "kana") {
      const record = book.history[card.id];
      const mode = (record?.level || 0) % 3;
      const ear = record?.ear || mode === 1;
      drill.listening = ear;
      const glyph = mode === 2 ? card.item.kata : card.item.hira;
      const prompt = ear
        ? '<h2>你听到了哪个音？</h2><div class="ear-prompt">' +
          ctx.soundButton(card.item.hira, "播放待辨认的假名") +
          "</div>"
        : `<h2>这个假名怎么读？</h2><p class="recall-glyph" lang="ja">${glyph}</p>`;
      return `${prompt}<form data-recall-form><label for="recall-input">输入罗马字</label><div class="recall-input"><input id="recall-input" type="text" inputmode="text" maxlength="16" autocomplete="off" autocapitalize="none" spellcheck="false" required><button class="btn primary">核对读音</button></div></form><button class="tool" data-action="recall-forgot">想不起来</button>`;
    }
    if (card.kind === "mistake") {
      const q = card.q;
      return `<h2>${ctx.esc(q.prompt)}</h2>${q.listen ? ctx.soundButton(q.listen, "听题目") : ""}<div class="answer-set">${q.options.map((o, i) => `<button class="answer" data-action="recall-choice" data-index="${i}">${ctx.esc(o)}</button>`).join("")}</div>`;
    }
    const listening = card.kind === "word";
    const prompt = listening
      ? '<h2>听词，试着说出中文意思</h2><div class="ear-prompt">' +
        ctx.soundButton(card.item.jp, "播放待复习的词") +
        "</div>"
      : `<h2>试着用日语说出来</h2><p class="recall-prompt">${ctx.esc(card.item.zh)}</p>`;
    if (!drill.revealed)
      return (
        prompt +
        `<button class="btn primary" data-action="recall-reveal">${listening ? "看词义和读音" : "说完了，看日语示范"}</button>`
      );
    return (
      prompt +
      `<div class="recall-model">${explanation(card)}</div><p>核对自己的答案，再选择这次的熟悉程度。</p><div class="actions"><button class="btn primary" data-action="recall-rate" data-result="ok">${listening ? "我想起了词义" : "我能独立说出"}</button><button class="tool" data-action="recall-rate" data-result="again">还需复习</button></div>`
    );
  }
  function daily() {
    const { book, day, plan, round, pending } = snap();
    const header = `<div class="inner narrow">${crumbs("今日复习")}<h1>今日复习</h1>`;
    if (feedback && feedback.day !== day) feedback = null;
    if (feedback) {
      const { id, ok, phase, due, typed } = feedback,
        card = recallCards.get(id);
      return (
        header +
        `<section class="practice-sheet"><p class="small-label">${phase === "retry" ? "本轮重练" : "核对答案"} · ${ctx.esc(card.label)}</p><h2>${ok ? "记住了" : "把这张再巩固一下"}</h2>${typed ? `<p>你输入了 <b>${ctx.esc(typed)}</b>。</p>` : ""}${explanation(card)}<p class="schedule-note">${!ok && phase === "first" ? "稍后在本轮再试一次。" : ""}下次复习安排在 ${dayLabel(due)}。</p><div class="actions"><button class="btn primary" data-action="recall-next">${pending ? "继续本轮" : "查看本轮结果"} →</button><a class="text-link" href="${card.source}">回看原课</a></div></section></div>`
      );
    }
    if (!pending) {
      if (round.ids.length) return header + summary(round, book) + "</div>";
      return (
        header +
        `<section class="practice-sheet"><h2>今天没有到期卡</h2><p>${plan.nextDue ? "下次复习在 " + dayLabel(plan.nextDue) + "。" : ""}也可以继续学新内容，或练习在实际场景里回应。</p><div class="actions"><a class="btn primary" href="#practice">去情景接话</a><a class="text-link" href="#courses">课程路线</a></div></section></div>`
      );
    }
    const { id, phase } = pending;
    if (!drill || drill.id !== id || drill.phase !== phase || drill.day !== day)
      drill = { id, phase, day, revealed: false };
    const card = recallCards.get(id);
    const mode =
      phase === "retry"
        ? "刚才没记牢，再来一次"
        : card.kind === "mistake"
          ? "来自错题本"
          : card.kind === "say"
            ? "表达回想"
            : card.kind === "word"
              ? "上次听错的情景词"
              : round.warmup
                ? "五元音热身"
                : "假名混练";
    const progress =
      phase === "retry"
        ? "本轮重练"
        : `第 ${Object.keys(round.first).length + 1} / ${round.ids.length} 张`;
    return (
      header +
      `<p class="lead">${round.warmup ? "第一次可以先用五个元音热身。需要示范时，点下方的「回看原课」。" : "每天最多五张，优先复习已到期的内容。"} </p><section class="practice-sheet" data-card="${ctx.esc(id)}" data-phase="${phase}"><p class="small-label">${progress} · ${mode} · ${ctx.esc(card.label)}</p>${cardQuestion(card, book)}<div class="practice-source"><a class="text-link" href="${card.source}">回看原课</a></div></section><details class="practice-method"><summary>我的复习时间怎么安排？</summary><p>逐行自测里听错的音和词也会进入待复习内容。每天从你学完的内容、收藏与错题中选最多 ${dailyLimit} 张。独立想起后，下次间隔依次为 1、3、7、14、30 天。没想起的卡本轮再练一次，次日再见。日期按设备当地时间计算。</p></details></div>`
    );
  }
  async function rate(ok, typed = "") {
    if (!drill || feedback) return;
    const { id, phase, day } = drill;
    let due;
    const changed = await updateBook(
      (book) => {
        if (localDay() !== day) return false;
        if (book.round?.day !== day)
          book.round = newRound(day, planDay(ctx.state, book.history, day));
        if (!recordRating(book, day, id, phase, ok)) return false;
        due = book.history[id].due;
        return true;
      },
      () => ctx.notify("浏览器未能保存记录，本次打开期间可以继续练习。"),
    );
    if (location.hash !== "#practice/daily") return;
    feedback = changed ? { id, phase, day, ok, due, typed } : null;
    if (!changed) ctx.notify("复习进度已更新，已切换到当前卡片。");
    redraw();
  }
  function initialScene(scene) {
    return {
      id: scene.id,
      turn: 0,
      choice: 0,
      bank: [],
      chosen: [],
      checked: false,
      error: false,
      hint: false,
      assisted: false,
      cueOpen: false,
      readings: false,
      results: [],
    };
  }
  function setBank(option) {
    const values = [...option.chunks, option.distractor];
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    if (
      values.filter((v) => v !== option.distractor).join("") ===
      option.chunks.join("")
    )
      values.reverse();
    session.bank = values;
    session.chosen = [];
  }
  function prep(scene, index, choice = 0) {
    Object.assign(session, {
      turn: index,
      choice,
      checked: false,
      error: false,
      hint: false,
      assisted: false,
      cueOpen: false,
    });
    if (index < scene.turns.length) setBank(scene.turns[index].choices[choice]);
  }
  function model(scene, jp, save = false) {
    const { key, item } = word(scene, jp);
    return `<div class="recall-model"><div class="model-line"><strong lang="ja">${ctx.esc(jp)}</strong>${ctx.soundButton(jp, "听日语示范", item.kana)}${save ? ctx.starButton(key) : ""}</div><p class="reading"><span lang="ja">${ctx.esc(item.kana)}</span> · ${ctx.esc(item.romaji)}</p><p>${ctx.esc(item.zh)}</p></div>`;
  }
  function sceneView(scene) {
    if (!session || session.id !== scene.id) {
      session = initialScene(scene);
      prep(scene, 0);
    }
    const s = session,
      head = `<div class="inner narrow">${crumbs(scene.place)}<h1>${scene.title}</h1><p class="lead">${scene.intro}</p>`;
    if (s.turn >= scene.turns.length) {
      const independent = s.results.filter((r) => !r.assisted).length;
      return (
        head +
        `<section class="practice-sheet"><p class="complete">情景演练完成</p><h2>你完成了 ${s.results.length} 次接话</h2><p>其中 ${independent} 次一次拼对，且没有查看提示。想隔天再练的句子，可以点星标收进复习手帖。</p>${s.results.map((r) => model(scene, r.line, true)).join("")}<div class="actions"><a class="btn primary" href="#practice">换个场景 →</a><button class="tool" data-action="scene-reset">再练一次</button><a class="text-link" href="#lesson/${scene.id}/0">回看本课</a></div></section></div>`
      );
    }
    const turn = scene.turns[s.turn],
      option = turn.choices[s.choice];
    const selected = s.chosen.map((i) => s.bank[i]);
    const prefix = selected.findIndex((v, i) => v !== option.chunks[i]);
    const step = prefix === -1 ? selected.length : prefix;
    const clue = turn.cue ? word(scene, turn.cue).item : null;
    const cue = clue
      ? `<div class="scene-cue"><div class="toolbar"><b>听对方说</b>${ctx.soundButton(clue.jp, "播放对方的话", clue.kana)}<button class="tool" data-action="scene-cue">${s.cueOpen ? "收起台词" : "看台词和意思"}</button></div>${s.cueOpen ? `<p lang="ja">${ctx.esc(clue.jp)}</p><p>${ctx.esc(clue.zh)}</p>` : ""}</div>`
      : "";
    const choices =
      turn.choices.length > 1
        ? `<div class="toolbar scene-choices"><span>你打算</span>${turn.choices.map((c, i) => `<button class="tool" data-action="scene-variant" data-index="${i}" aria-pressed="${s.choice === i}">${c.label}</button>`).join("")}</div>`
        : "";
    if (s.checked) {
      return (
        head +
        `<section class="practice-sheet"><p class="complete">这一句拼对了 · 第 ${s.turn + 1} / ${scene.turns.length} 回合</p><h2>听示范，再完整说一遍</h2>${model(scene, option.line, true)}<p>${option.hint}</p>${turn.reply ? `<h3 class="reply-title">对方的回应</h3>${model(scene, turn.reply)}` : ""}<button class="btn primary" data-action="scene-next">${s.turn === scene.turns.length - 1 ? "完成情景" : "接着对话"} →</button></section></div>`
      );
    }
    const chipText = (v) =>
      s.readings && chunkReading(v) !== v
        ? "<span>" + v + "</span><small>" + chunkReading(v) + "</small>"
        : v;
    const chips = s.chosen
      .map(
        (position, i) =>
          `<button lang="ja" class="phrase-chip picked" data-action="scene-remove" data-index="${i}" aria-label="移回 ${s.bank[position]}">${chipText(s.bank[position])}</button>`,
      )
      .join("");
    const bank = s.bank
      .map(
        (v, i) =>
          `<button lang="ja" class="phrase-chip" data-action="scene-add" data-index="${i}" ${s.chosen.includes(i) ? "disabled" : ""}>${chipText(v)}</button>`,
      )
      .join("");
    return (
      head +
      `<section class="practice-sheet"><p class="small-label">情景接话 · 第 ${s.turn + 1} / ${scene.turns.length} 回合</p>${cue}${choices}<h2>${option.goal}</h2><p>先自己说一遍，再点语块拼出课里的说法。点已选语块可以撤回。</p><div class="sentence-tray" aria-label="我的回答">${chips || '<span class="muted">在这里组成你的回答</span>'}</div><button class="tool reading-switch" data-action="scene-readings" aria-pressed="${s.readings}">${s.readings ? "收起语块读音" : "显示语块读音"}</button><div class="tile-bank" aria-label="可选语块">${bank}</div>${s.error || s.hint ? `<p class="feedback ${s.error ? "error" : ""}" role="status">${s.error ? "这与本课的示范顺序不同。" : ""}${option.hint} ${s.hint && step < option.chunks.length ? `第 ${step + 1} 块试试「${option.chunks[step]}」。` : ""}</p>` : ""}<div class="actions"><button class="btn primary" data-action="scene-check" ${s.chosen.length ? "" : "disabled"}>核对这一句</button><button class="tool" data-action="scene-hint">给我提示</button></div></section><p class="practice-source"><a class="text-link" href="#lesson/${scene.id}/0">回看本课</a></p></div>`
    );
  }
  function route() {
    const [, part, id] = location.hash.slice(1).split("/");
    if (part === "daily") return daily();
    if (part === "scene" && sceneById.has(id))
      return sceneView(sceneById.get(id));
    return hub();
  }
  function redraw() {
    const active = document.activeElement;
    const oldAction = active?.dataset.action;
    const oldIndex = active?.dataset.index;
    ctx.silence();
    const main = document.querySelector("main");
    main.innerHTML = route();
    const same =
      oldAction &&
      [...main.querySelectorAll("button[data-action]:not(:disabled)")].find(
        (b) => b.dataset.action === oldAction && b.dataset.index === oldIndex,
      );
    const target =
      same ||
      (oldAction === "scene-add" &&
        main.querySelector(".tile-bank button:not(:disabled)")) ||
      main.querySelector("#recall-input, .practice-sheet h2");
    if (target) {
      if (target.tagName === "H2") target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
  }
  function handle(button) {
    const { action, index } = button.dataset;
    if (action === "recall-next") {
      feedback = null;
      drill = null;
      redraw();
      return;
    }
    if (action.startsWith("recall-")) {
      const c = drill && recallCards.get(drill.id);
      if (!c) return;
      if (action === "recall-reveal") {
        drill.revealed = true;
        redraw();
        return;
      }
      if (action === "recall-choice") void rate(Number(index) === c.q.answer);
      if (action === "recall-forgot") void rate(false);
      if (action === "recall-rate") void rate(button.dataset.result === "ok");
      return;
    }
    const scene = sceneById.get(session?.id);
    if (!scene) return;
    if (action === "scene-reset") {
      session = initialScene(scene);
      prep(scene, 0);
      redraw();
      return;
    }
    const s = session,
      turn = scene.turns[s.turn];
    if (!turn) return;
    const choice = turn.choices[s.choice],
      i = Number(index);
    switch (action) {
      case "scene-add":
        if (!s.chosen.includes(i) && i >= 0 && i < s.bank.length)
          s.chosen.push(i);
        s.error = false;
        s.hint = false;
        break;
      case "scene-remove":
        s.chosen.splice(i, 1);
        s.error = false;
        s.hint = false;
        break;
      case "scene-readings":
        s.readings = !s.readings;
        break;
      case "scene-cue":
        s.cueOpen = !s.cueOpen;
        if (s.cueOpen) s.assisted = true;
        break;
      case "scene-variant":
        if (i === s.choice) return;
        {
          const assisted = s.assisted;
          const cueOpen = s.cueOpen;
          prep(scene, s.turn, i);
          s.assisted = assisted;
          s.cueOpen = cueOpen;
        }
        break;
      case "scene-hint":
        s.hint = true;
        s.assisted = true;
        break;
      case "scene-check":
        s.checked =
          s.chosen.map((k) => s.bank[k]).join("") === choice.chunks.join("");
        s.error = !s.checked;
        if (s.error) s.assisted = true;
        break;
      case "scene-next":
        if (!s.checked) return;
        s.results.push({ line: choice.line, assisted: s.assisted });
        prep(scene, s.turn + 1);
        break;
      default:
        return;
    }
    redraw();
  }
  function submit(form) {
    if (drill && !feedback) {
      const value = form.querySelector("input").value.trim();
      if (value)
        void rate(
          matchesRomaji(recallCards.get(drill.id).item, value, drill.listening),
          value,
        );
    }
  }
  return {
    flagMiss(id) {
      void updateBook(
        (book) => flagListeningMiss(book, id, localDay()),
        () => ctx.notify("本次复习记录暂时只保存在当前页面。"),
      );
    },
    entry,
    hub,
    daily,
    sceneView,
    handle,
    submit,
    leaveDaily() {
      drill = null;
      feedback = null;
    },
    title(part, id) {
      return part === "daily"
        ? "今日复习"
        : sceneById.get(id)?.title || "练习室";
    },
    view(part, id) {
      return part === "daily"
        ? daily()
        : part === "scene" && sceneById.has(id)
          ? sceneView(sceneById.get(id))
          : hub();
    },
  };
}
