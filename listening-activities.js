import { station, animeScenes } from "./activity-data.js";

export const activityTitles = {
  platform: "听回答，去站台",
  anime: "动漫台词拆听",
};

function shuffledPlatforms() {
  const order = station.platforms.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
function turn() {
  return {
    heard: false,
    repeat: false,
    assisted: false,
    wrong: [],
    solved: false,
    showText: false,
    error: "",
  };
}
function button(action, label, disabled = false, cls = "tool", index = "") {
  return `<button type="button" class="${cls}" data-action="listen-${action}" data-index="${index}" ${disabled ? "disabled" : ""}>${label}</button>`;
}

export function createListening(ctx) {
  let mode = null,
    order = [],
    round = 0,
    independent = 0,
    current,
    playing = "",
    epoch = 0;
  function enter(next) {
    if (next === mode) return;
    mode = next;
    order =
      next === "platform" ? shuffledPlatforms() : animeScenes.map((_, i) => i);
    round = 0;
    independent = 0;
    current = turn();
  }
  function stop() {
    epoch++;
    playing = "";
    const active = document.querySelector("main [data-audio-active]");
    if (active) {
      active.textContent = active.dataset.idle;
      active.removeAttribute("data-audio-active");
    }
  }
  function redraw(focusAction) {
    const old = document.activeElement?.dataset;
    const main = document.querySelector("main");
    main.innerHTML = view(mode);
    const candidates = [
      ...main.querySelectorAll("button[data-action]:not(:disabled)"),
    ];
    const next = candidates.find((b) =>
      focusAction
        ? b.dataset.action === "listen-" + focusAction
        : b.dataset.action === old?.action && b.dataset.index === old?.index,
    );
    if (next) next.focus({ preventScroll: true });
    else {
      const heading = main.querySelector(".practice-sheet h2");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }
  }
  function lineModel(v) {
    return `<div class="model-line"><strong lang="ja">${v.jp}</strong>${ctx.soundButton(v.jp, "听这句示范", v.kana, v.learner)}${ctx.recordButton({ ...v, compact: true })}</div><p class="reading" lang="ja">${v.kana}</p><p>${v.zh}</p>`;
  }
  function listenControl(id, label) {
    const active = playing === id || (playing === "repeat" && id === "play");
    return `<button class="btn primary" type="button" data-action="listen-${id}" data-idle="${label}" ${active ? "data-audio-active" : ""}>${active ? "停止播放" : label}</button>`;
  }
  function platform() {
    const n = order[round],
      answer = station.platforms[n],
      t = current;
    const allowed = t.heard || t.showText;
    return `<h2>跟着回答选站台</h2><p>你问了去京都的车在几号站台。听站员的回答，再点图里的入口。</p><details><summary>先练怎么问站台</summary>${lineModel(station.question)}</details>
    <div class="actions">${listenControl("play", "听站员回答")}${!t.solved ? button("ask", "没听清，请再说一遍") : ""}</div>
    ${t.repeat && !t.solved ? `<div class="listen-helper"><strong>先用日语请站员重复</strong>${lineModel({ ...station.repeat, afterRecording: "station-repeat", tip: "读完请求后关闭录音窗口，站员会重复刚才的回答。" })}<p>可以直接说，也可以录下请求。录完关窗就会听到同一个回答。</p>${button("repeat", "我说好了，听站员重说")}</div>` : ""}
    <div class="platform-map" role="group" aria-label="模拟车站站台图"><div class="concourse"><span lang="ja">改札口</span> 检票口</div><div class="platform-branches">${station.platforms.map((_, i) => `<button type="button" class="platform-sign ${t.solved && i === n ? "arrived" : ""}" data-action="listen-choose" data-index="${i}" aria-label="去 ${i + 1} 号站台" ${!allowed || t.solved || t.wrong.includes(i) ? "disabled" : ""}><b>${i + 1}</b><span lang="ja">番線</span></button>`).join("")}</div></div>
    ${t.wrong.length && !t.solved ? '<p role="status" class="feedback error">再听「ばんせん」前面的数字，然后换一个入口。</p>' : ""}
    ${t.solved ? `<div class="feedback" role="status"><strong>到了，${n + 1} 号站台。</strong>${lineModel(answer)}</div>${button("next", round === order.length - 1 ? "看练习结果" : "听下一条回答", false, "btn primary")}` : t.showText ? `<p lang="ja">${answer.jp}（${answer.kana}）</p>` : button("text", "需要文字提示")}
    `;
  }
  function anime() {
    const s = animeScenes[order[round]],
      t = current;
    return `<h2>${s.title}</h2><p>${s.setting}</p><div class="actions">${listenControl("play", "听两人的对话")}</div>
    <h3>${s.question}</h3><div class="answer-set">${s.options.map((x, i) => button("choose", x, !t.heard || t.showText || t.wrong.includes(i), "answer", i)).join("")}</div>
    ${t.wrong.length && !t.showText ? '<p class="feedback error" role="status">再听朋友回答的那一句，留意动作和它前面的词。</p>' : ""}
    ${
      !t.showText
        ? button("text", "我想拆开听", !t.heard && !t.error)
        : `<div class="anime-script"><p class="feedback" role="status">${t.solved ? "听懂了。" : "这段的意思是："}${s.options[s.answer]}。</p>
    ${s.lines.map((v, i) => `<article><small>朋友 ${i ? "B" : "A"}</small>${lineModel(v)}</article>`).join("")}
    <h3>把回答拆开听</h3>${s.chunks.map((v) => `<div class="chunk-line"><span lang="ja">${v.jp}</span>${ctx.soundButton(v.jp, "听语块" + v.jp)}<p>${v.zh}</p></div>`).join("")}
    <h3>完整说法和口语</h3><div class="contraction"><div><small>完整说法</small><span lang="ja">${ctx.esc(s.full.jp).replace(/い(?=る$)/u, "<mark>い</mark>")}</span>${ctx.soundButton(s.full.jp, "听完整说法")}</div><span aria-hidden="true">→</span><div><small>朋友间的说法</small><span lang="ja">${s.casual.jp}</span>${ctx.soundButton(s.casual.jp, "听口语说法")}</div></div>
    <p>${s.tip}</p><div class="actions">${listenControl("compare", "连听完整与口语")}${button("next", round === order.length - 1 ? "看练习结果" : "听下一段原创对话", false, "btn primary")}</div></div>`
    }`;
  }
  function view(next) {
    enter(next);
    const title = activityTitles[next],
      stationMode = next === "platform";
    const inner =
      round >= order.length
        ? `<h2>${stationMode ? "站台练习完成" : "两段对话练完了"}</h2><p>${order.length} ${stationMode ? "轮里" : "段中"}，${independent} ${stationMode ? "轮首次听对站台" : "段首次听懂意思"}（独立完成）。</p><div class="actions">${button("reset", "再练一次", false, "btn primary")}<a class="tool" href="#practice">回练习室</a></div>`
        : `<p class="small-label">${stationMode ? "站台" : "原创对话"} · ${round + 1} / ${order.length}</p>${stationMode ? platform() : anime()}${current.error ? `<p role="status" class="feedback error">${ctx.esc(current.error)}</p>` : ""}`;
    return `<div class="inner narrow"><div class="crumb"><a href="#practice">练习室</a> › ${title}</div><h1>${title}</h1><section class="practice-sheet listening-sheet">${inner}</section></div>`;
  }
  async function play(kind) {
    const same = playing === kind || (playing === "repeat" && kind === "play");
    ctx.silence();
    if (same) {
      redraw();
      return;
    }
    const token = epoch,
      t = current;
    if (t.heard && kind === "play" && !t.solved && !t.showText)
      t.assisted = true;
    playing = kind;
    t.error = "";
    if (kind === "repeat") {
      t.repeat = false;
      t.assisted = true;
    }
    redraw(kind === "repeat" ? "play" : kind);
    const s = animeScenes[order[round]];
    const lines =
      mode === "platform"
        ? [station.platforms[order[round]]]
        : kind === "compare"
          ? [s.full, s.casual]
          : s.lines;
    try {
      for (const [i, line] of lines.entries()) {
        if (token !== epoch) return;
        await ctx.speak(
          line.jp,
          kind === "repeat" || ctx.slow(),
          line.kana,
          line.learner,
        );
        if (i + 1 < lines.length && token === epoch)
          await new Promise((r) => setTimeout(r, 320));
      }
      if (token !== epoch) return;
      t.heard = true;
    } catch (e) {
      if (token !== epoch) return;
      t.error = e.message;
    }
    playing = "";
    redraw();
  }
  function handle(b) {
    const action = b.dataset.action.slice(7);
    if (action === "reset") {
      ctx.silence();
      const prev = mode;
      mode = null;
      enter(prev);
      redraw("play");
      return;
    }
    if (round >= order.length) return;
    if (["play", "repeat", "compare"].includes(action)) {
      void play(action);
      return;
    }
    ctx.silence();
    if (action === "ask") {
      current.repeat = true;
      current.assisted = true;
    } else if (action === "text") {
      current.showText = true;
      current.assisted = true;
    } else if (action === "choose") {
      const i = Number(b.dataset.index);
      if (current.solved || current.wrong.includes(i)) return;
      const correct =
        mode === "platform" ? order[round] : animeScenes[order[round]].answer;
      if (i === correct) {
        current.solved = true;
        current.showText = true;
        current.repeat = false;
        if (!current.wrong.length && !current.assisted) independent++;
      } else current.wrong.push(i);
    } else if (action === "next") {
      round++;
      current = turn();
      redraw("play");
      return;
    }
    redraw();
  }
  return {
    view,
    handle,
    stop,
    leave(next) {
      if (next !== mode) mode = null;
    },
    repeat() {
      if (mode === "platform" && current?.repeat && !current.solved)
        void play("repeat");
    },
  };
}
