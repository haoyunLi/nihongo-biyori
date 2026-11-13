import { contrasts, contrastById, listeningRound } from "./contrast-data.js";
import { speak } from "./audio.js?v=11";

let session,
  generation = 0,
  playing = "";
const panel = () => document.querySelector("#contrast-panel");
function status(text) {
  const el = panel()?.querySelector("[data-contrast-status]");
  if (el) el.textContent = text;
}
export function stopContrast(announce = true) {
  if (playing && announce) status("播放已停止。");
  generation++;
  playing = "";
  const b = panel()?.querySelector("[data-playing]");
  if (b) {
    b.removeAttribute("data-playing");
    b.textContent = b.dataset.idle;
  }
  panel()
    ?.querySelectorAll(".contrast-word.audible")
    .forEach((el) => el.classList.remove("audible"));
}
export function leaveContrast() {
  stopContrast();
  session = null;
}
export function contrastURL(id) {
  return "#practice/sounds/" + id;
}
function compare(pair, ctx) {
  const voice = ["kaga", "shichi"].includes(pair.id)
    ? "真人示范"
    : "VOICEVOX Nemo 配音";
  return `<p class="small-label">对照听 · ${pair.category} · ${voice}</p><h2>${pair.cue}</h2><p>${pair.context}</p>
    <div class="contrast-words">${pair.items.map((v, i) => `<article class="contrast-word" data-word="${i}"><div class="model-line"><strong lang="ja">${v.jp}</strong>${ctx.soundButton(v.audio, "听「" + v.jp + "」")}</div><p>${v.zh}</p><div class="word-beats">${v.beats.map((b, k) => `<span lang="ja" class="${v.focus.includes(k) ? "target" : ""}">${b}</span>`).join("")}</div><p class="reading">${v.beats.length} 拍</p>${ctx.recordButton({ jp: v.jp, audio: v.audio, kana: v.beats.join(""), zh: v.zh, tip: pair.self })}</article>`).join("")}</div>
    <div class="actions"><button class="tool" data-action="contrast-pair" data-idle="连续听两边">连续听两边</button><button class="tool" data-action="contrast-speed" aria-pressed="${ctx.slow()}">${ctx.slow() ? "慢速播放 ✓" : "慢速播放"}</button><button class="btn primary" data-action="contrast-start">开始四题盲听 →</button></div>
    <p class="contrast-status" data-contrast-status role="status"></p><p class="contrast-tip">${pair.self}</p>`;
}
function trial(pair, ctx) {
  const s = session,
    target = pair.items[s.order[s.index]],
    answered = s.choice !== null,
    correct = s.choice === s.order[s.index];
  return `<p class="small-label">盲听 · 第 ${s.index + 1} / ${s.order.length} 题</p><h2>刚才听到哪一个？</h2><div class="actions"><button class="tool" data-action="contrast-listen" data-idle="再听题音">再听题音</button><button class="tool" data-action="contrast-speed" aria-pressed="${ctx.slow()}">${ctx.slow() ? "慢速播放 ✓" : "慢速播放"}</button></div><p class="contrast-status" data-contrast-status role="status"></p>
    <div class="answer-set">${pair.items.map((v, i) => `<button class="answer ${answered && i === s.order[s.index] ? "correct" : answered && i === s.choice ? "incorrect" : ""}" data-action="contrast-answer" data-index="${i}" ${!s.heard || answered ? "disabled" : ""}><b>${i ? "B" : "A"}</b><span><span lang="ja">${v.jp}</span> · ${v.zh}</span></button>`).join("")}</div>
    ${answered ? `<div class="feedback ${correct ? "" : "error"}" role="status"><strong>${correct ? "听对了。" : "这次听到的是「" + target.jp + "」。"}</strong> ${target.beats.join("・")}，共 ${target.beats.length} 拍。${pair.cue}${correct ? "" : " 这个音已记入待复习内容。"}</div><div class="actions">${ctx.recordButton({ jp: target.jp, audio: target.audio, kana: target.beats.join(""), zh: target.zh, tip: pair.self })}<button class="btn primary" data-action="contrast-next">${s.index + 1 === s.order.length ? "看本轮结果" : "下一题"} →</button></div>` : ""}
    <p class="practice-source"><button class="tool" data-action="contrast-back">回到两音对照</button></p>`;
}
function result(pair) {
  const count = session.answers.filter(Boolean).length;
  const next = contrasts[(contrasts.indexOf(pair) + 1) % contrasts.length];
  return `<p class="complete">本轮结束</p><h2>四题中听对了 ${count} 题</h2><p>${count === 4 ? "再换一组，看看换到别的词时还能不能听出拍数。" : pair.self}</p><div class="actions"><a class="btn primary" href="${contrastURL(next.id)}">练下一组 →</a><button class="tool" data-action="contrast-back">再练这组</button><a class="text-link" href="#practice/daily">今日复习</a></div>`;
}
function body(pair, ctx) {
  if (session.phase === "quiz") return trial(pair, ctx);
  if (session.phase === "done") return result(pair);
  return compare(pair, ctx);
}
export function contrastView(id, ctx) {
  const pair = contrastById.get(id) || contrasts[0];
  if (!session || session.id !== pair.id)
    session = { id: pair.id, phase: "compare" };
  return `<div class="inner narrow"><div class="crumb"><a href="#practice">练习室</a><span>›</span>耳朵练习</div><h1>相近音听辨</h1><p class="lead">先听两边，再试四题盲听。每格代表一拍，朱红色标出最值得留意的位置。</p><div class="contrast-picker"><label for="choose-pair">选择一组</label><select id="choose-pair" data-contrast-select>${contrasts.map((p) => `<option value="${p.id}" ${p.id === pair.id ? "selected" : ""}>${p.category} · ${p.title}</option>`).join("")}</select></div><section id="contrast-panel" class="practice-sheet">${body(pair, ctx)}</section><p class="practice-source"><a class="text-link" href="#lesson/${pair.lesson}/${pair.step}">回看相关课程</a></p></div>`;
}
function draw(pair, ctx, focus) {
  if (!panel()) return;
  panel().innerHTML = body(pair, ctx);
  if (focus) panel().querySelector(focus)?.focus({ preventScroll: true });
}
async function listen(pair, mode, ctx) {
  const alreadyPlaying = playing === mode;
  ctx.silence();
  if (alreadyPlaying) {
    status("播放已停止。");
    return;
  }
  const ticket = generation;
  const button = panel()?.querySelector(`[data-action="contrast-${mode}"]`);
  if (button) {
    button.dataset.playing = "true";
    button.textContent = "停止播放";
  }
  playing = mode;
  try {
    const order = mode === "pair" ? [0, 1] : [session.order[session.index]];
    for (const [position, id] of order.entries()) {
      if (ticket !== generation) return;
      const v = pair.items[id];
      if (mode === "pair")
        panel().querySelector(`[data-word="${id}"]`)?.classList.add("audible");
      status(mode === "pair" ? "正在示范「" + v.jp + "」。" : "正在播放题音。");
      await speak(v.audio, ctx.slow());
      if (ticket !== generation) return;
      if (mode === "pair")
        panel()
          .querySelector(`[data-word="${id}"]`)
          ?.classList.remove("audible");
      if (position + 1 < order.length)
        await new Promise((resolve) => setTimeout(resolve, 420));
    }
    if (ticket !== generation) return;
    if (mode === "listen") {
      session.heard = true;
      if (session.choice === null)
        panel()
          .querySelectorAll('[data-action="contrast-answer"]')
          .forEach((b) => (b.disabled = false));
    }
    status(
      mode === "pair"
        ? "两边都听完了。"
        : session.choice === null
          ? "请选择听到的音。"
          : "播放结束。",
    );
  } catch (err) {
    if (ticket === generation) status(err.message);
  } finally {
    if (ticket === generation) stopContrast(false);
  }
}
export function handleContrast(button, ctx) {
  if (!session || !panel()) return;
  const pair = contrastById.get(session.id);
  const action = button.dataset.action;
  if (action === "contrast-pair" || action === "contrast-listen") {
    void listen(pair, action === "contrast-pair" ? "pair" : "listen", ctx);
    return;
  }
  ctx.silence();
  switch (action) {
    case "contrast-start":
      Object.assign(session, {
        phase: "quiz",
        order: listeningRound(),
        index: 0,
        answers: [],
        choice: null,
        heard: false,
      });
      draw(pair, ctx, '[data-action="contrast-listen"]');
      void listen(pair, "listen", ctx);
      break;
    case "contrast-answer": {
      if (session.phase !== "quiz" || !session.heard || session.choice !== null)
        return;
      const choice = Number(button.dataset.index);
      if (choice !== 0 && choice !== 1) return;
      session.choice = choice;
      const truth = session.order[session.index],
        right = truth === choice;
      session.answers.push(right);
      if (!right)
        ctx.flagMiss(
          "contrast:" + pair.id + ":" + truth,
          pair.items[choice].jp + " · " + pair.items[choice].zh,
        );
      draw(pair, ctx, '[data-action="contrast-next"]');
      break;
    }
    case "contrast-next":
      if (session.phase !== "quiz" || session.choice === null) return;
      session.index++;
      if (session.index === session.order.length) {
        session.phase = "done";
        draw(pair, ctx, "a.primary");
      } else {
        session.choice = null;
        session.heard = false;
        draw(pair, ctx, '[data-action="contrast-listen"]');
        void listen(pair, "listen", ctx);
      }
      break;
    case "contrast-speed":
      ctx.setSlow(!ctx.slow());
      draw(pair, ctx, '[data-action="contrast-speed"]');
      break;
    case "contrast-back":
      session.phase = "compare";
      draw(pair, ctx, '[data-action="contrast-start"]');
      break;
  }
}
