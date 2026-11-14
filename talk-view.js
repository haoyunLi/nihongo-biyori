import { assignedEntry, assignedAnswer } from "./trip-encounters.js";
import { tripByChapter } from "./weekly-trips.js";
import { talks } from "./talk-data.js?v=13";
import {
  interpret,
  makeRun,
  finishTurn,
  needsPractice,
} from "./talk-engine.js?v=13";
import {
  createSpeechModel,
  createConversationMic,
  voiceAvailable,
} from "./talk-voice.js?v=13";

import { canAutoReply } from "./talk-turn.js?v=14";
const route = (id) => "#practice/talk" + (id ? "/" + id : "");
const storage = "nihongo-biyori-dialogue-review-v1";
const names = {
  unclear: "答复没接上",
  hint: "看了提示",
  model: "听看了示范",
  repeat: "请求重说",
  skip: "这句先跳过",
  text: "看了原句",
};
const lessonScene = {
  t04: "restaurant",
  m02: "restaurant",
  t05: "restaurant",
  t07: "restaurant",
  t09: "restaurant",
  t02: "station",
  t08: "station",
  c01: "friends",
  m03: "friends",
  m04: "friends",
};
export function talkLink(id, scene = lessonScene[id]) {
  return scene
    ? `<a class="tool" href="${route(scene)}">开口对话 · ${talks[scene].title} →</a>`
    : "";
}
export const validTalk = (id) => id === undefined || Object.hasOwn(talks, id);
function saved(scene) {
  try {
    const rows = JSON.parse(
      localStorage.getItem(storage + ":" + scene) || "[]",
    );
    return Array.isArray(rows)
      ? rows
          .filter(
            (r) =>
              r &&
              Object.hasOwn(talks[scene].nodes, r.id) &&
              Array.isArray(r.flags),
          )
          .slice(-60)
      : [];
  } catch {
    return [];
  }
}
const button = (a, label, main = false, disabled = false) =>
  `<button type="button" class="${main ? "btn primary" : "tool"}" data-action="talk-${a}" ${disabled ? "disabled" : ""}>${label}</button>`;
export function createTalk(ctx) {
  const modelStore = createSpeechModel();
  const mic = createConversationMic(modelStore);
  let continuous = false,
    confirming = false,
    preferredAuto = false;
  let assignment;
  let scene,
    run,
    previous = [],
    clip = [],
    draft = "",
    typed = false,
    phase = "",
    notice = "",
    attempt = "",
    captured = false,
    hint = false,
    showLine = false,
    models = false,
    epoch = 0,
    capture,
    heard = false,
    lastTurn = null,
    memoryNote = "";
  const entry = () => assignedEntry(run?.node);
  function getNode() {
    if (!assignment) return talks[scene].nodes[run.node];
    const t = entry();
    const target =
      assignment.review && t.choices
        ? t.answers[run.items[run.index].choice]
        : null;
    return {
      title: t.goal,
      prompt:
        run.items[run.index].cue ||
        (run.items[run.index].variant ? t.alternate : t.first),
      hint:
        t.choices && !target
          ? "你可以自己选：" +
            t.answers.map((a) => a.model.zh).join(" / ") +
            "。用你想走的那种说法回答。"
          : "先想想「" + (target || t).model.zh + "」怎么说。需要时展开示范。",
      edges: (t.answers || [t])
        .map((a, choice) => ({ model: a.model, choice, next: null }))
        .filter((e) => !target || e.choice === run.items[run.index].choice),
    };
  }
  const understand = (raw) =>
    assignment
      ? assignedAnswer(
          entry(),
          raw,
          assignment.review ? run.items[run.index].choice : undefined,
        )
      : interpret(scene, run.node, raw);
  const partner = () => talks[assignment ? entry().scene : scene];
  const partnerRole = () => (assignment ? entry().role : partner().role);

  const busy = () =>
    ["loading", "permission", "listening", "decoding"].includes(phase);
  function stop() {
    epoch++;
    capture?.cancel();
    capture = null;
    ctx.stopAudio();
    phase = "";
  }
  function endVoice() {
    continuous = false;
    confirming = false;
    mic.close();
  }
  function leave() {
    stop();
    endVoice();
    modelStore.release();
    run = null;
    assignment = null;
    scene = null;
  }
  function enter(id) {
    leave();
    scene = id;
    preferredAuto = false;
    if (id) previous = saved(id);
    memoryNote = "";
  }
  function enterAssignment(config) {
    leave();
    assignment = config;
    scene = config.items.length
      ? assignedEntry(config.items[0].id).scene
      : null;
    preferredAuto = false;
  }
  function clearTurn() {
    draft = "";
    typed = false;
    phase = "";
    notice = "";
    attempt = "";
    captured = false;
    confirming = false;
    hint = false;
    showLine = false;
    models = false;
    heard = false;
  }
  function sync() {
    const i = ctx.main.querySelector("[data-talk-draft]");
    if (i) draft = i.value;
  }
  function refresh(focus) {
    ctx.main.innerHTML = view();
    if (focus) {
      const el = ctx.main.querySelector(focus);
      el?.focus({ preventScroll: true });
    }
  }
  function saveReview() {
    // Store turn keys and support used, never audio or learner transcripts.
    const byId = new Map(previous.map((r) => [r.id, r]));
    for (const r of run.records) {
      if (r.flags.length)
        byId.set(r.id, { id: r.id, flags: r.flags, model: r.model });
      else byId.delete(r.id);
    }
    previous = [...byId.values()];
    try {
      localStorage.setItem(storage + ":" + scene, JSON.stringify(previous));
    } catch {
      memoryNote = "这次的待练句保存在当前页面。";
    }
  }
  function start(items = null, auto = false) {
    stop();
    endVoice();
    continuous = auto && voiceAvailable();
    preferredAuto = continuous;
    if (continuous) mic.unlock();
    run = makeRun(scene, items);
    clearTurn();
    lastTurn = null;
    clip = [getNode().prompt];
    refresh();
    void play(clip);
  }
  async function play(lines, slow = false, listenAfter = true) {
    sync();
    stop();
    const ticket = epoch;
    phase = "playing";
    let played = false;
    refresh();
    try {
      for (const line of lines) {
        if (ticket !== epoch) return;
        await ctx.speak(line.jp, slow, line.kana);
      }
      if (ticket === epoch) {
        heard = true;
        played = true;
      }
    } catch (e) {
      if (ticket === epoch) {
        endVoice();
        notice = "声音未能播放。可以重听或展开原句继续。";
      }
    } finally {
      if (ticket === epoch) {
        sync();
        phase = "";
        if (
          played &&
          continuous &&
          listenAfter &&
          !confirming &&
          run &&
          !run.done &&
          !document.hidden
        ) {
          // Let the last sound from a loudspeaker die out before unmuting.
          await new Promise((resolve) => setTimeout(resolve, 270));
          if (ticket === epoch && !document.hidden && continuous) record();
        } else refresh();
      }
    }
  }
  function record() {
    sync();
    stop();
    const ticket = epoch;
    notice = "";
    phase = "loading";
    refresh();
    confirming = false;
    capture = mic.listen({
      automatic: continuous,
      status(value) {
        if (ticket === epoch) {
          phase = value;
          refresh();
        }
      },
      complete(result, reason) {
        const value = result.text;
        if (ticket !== epoch) return;
        capture = null;
        phase = "";
        if (continuous) {
          const intent = understand(value);
          if (canAutoReply(result, intent, reason)) {
            accept(value, intent);
            return;
          }
          confirming = true;
        } else mic.close();
        draft = value;
        captured = !!value;
        typed = true;
        notice = value
          ? continuous
            ? "这句需要核对。确认文字或改字后发送，也可以重说本句。"
            : "核对听写后发送。识别有误可以直接改字。"
          : "没有听清声音。这次不记作没接上，可以重说或输入日语。";
        refresh(
          value ? '[data-action="talk-send"]' : '[data-action="talk-record"]',
        );
      },
      fail(message) {
        if (ticket !== epoch) return;
        capture = null;
        phase = "";
        endVoice();
        typed = true;
        notice = message;
        refresh("[data-talk-draft]");
      },
    });
  }
  function advance(result, { text = "", skipped = false } = {}) {
    stop();
    const node = getNode(),
      model = result.model || node.edges[0].model.jp;
    lastTurn = { text, skipped, model };
    const variant = run.items?.[run.index]?.variant;
    const record = finishTurn(run, result, {
      text,
      model,
      attempt,
      skipped,
      choice: result.choice,
    });
    if (assignment) {
      assignment.result(record, variant);
      if (assignment.trip) {
        const progress = assignment.progress();
        assignment.trip = progress.trip;
        run.items.splice(
          run.index,
          run.items.length - run.index,
          ...progress.items,
        );
        run.node = run.items[run.index]?.id ?? null;
        run.done = run.node === null;
      }
    }
    clearTurn();
    clip = [...result.replies];
    if (run.done) {
      endVoice();
      if (run.items) clip = [];
      if (assignment) assignment.complete();
      else saveReview();
      refresh();
      if (clip.length) void play(clip);
      return;
    }
    if (run.items) clip = [];
    clip.push(getNode().prompt);
    refresh();
    void play(clip);
  }
  function send() {
    sync();
    if (!run || run.done || busy()) return;
    if (!draft.trim()) {
      notice = "请先说一句或输入日语。";
      refresh("[data-talk-draft]");
      return;
    }
    const raw = draft.trim().slice(0, 160),
      result = understand(raw);
    accept(raw, result);
  }
  function accept(raw, result) {
    confirming = false;
    if (result.kind === "ok") {
      advance(result, { text: raw });
      return;
    }
    if (result.kind === "repeat") {
      stop();
      noteSupport("repeat");
      draft = "";
      typed = false;
      captured = false;
      notice = "对方会把刚才的问题慢一点再说一次。";
      refresh();
      void play([getNode().prompt], true);
      return;
    }
    stop();
    confirming = continuous;
    noteSupport("unclear");
    attempt = raw;
    notice =
      result.message || "对方还没能接上这句。可以换个说法，也可以点提示。";
    refresh("[data-talk-draft]");
  }
  function optLine(l) {
    return `<div class="talk-example"><span lang="ja">${ctx.esc(l.jp)}</span><p class="reading">${ctx.esc(l.kana)} · ${ctx.esc(l.zh)}</p></div>`;
  }
  function noteSupport(flag) {
    run.support.add(flag);
    assignment?.help?.(run.node, flag);
  }
  function itinerary(trip, current) {
    return (
      '<div class="trip-stops" aria-label="行程">' +
      trip.stops
        .map(
          (s, i) =>
            "<span" +
            (i === current ? ' aria-current="step"' : "") +
            "><b>" +
            (i + 1) +
            "</b> " +
            ctx.esc(s.place) +
            "</span>",
        )
        .join("") +
      "</div>"
    );
  }
  function hub() {
    return `<h1>开口对话</h1><p class="lead">听对方问，直接用日语说出自己的选择。对方会按你的回答接下去。</p><div class="scene-list">${Object.entries(
      talks,
    )
      .map(
        ([id, s]) =>
          `<a class="scene-link" href="${route(id)}"><span>${s.role}</span><strong>${s.title}</strong><span>开始对话 →</span></a>`,
      )
      .join("")}</div>`;
  }
  function intro() {
    const s = talks[scene];
    return `<h1>${s.title}</h1><p class="lead">${s.intro}</p><section class="practice-feature"><h2>你来接话</h2><p>听完直接说，句末停约一秒半。${s.role}会接着问，没听清时再核对。</p><div class="actions">${voiceAvailable() ? button("auto", "开启连续对话", true) : ""}${button("start", "逐句练习或输入日语", !voiceAvailable())}${previous.length ? button("retry", "只重练上次卡住的 " + previous.length + " 句") : ""}</div></section><p class="reading">首次开麦会下载约 55 MB 的日语识别工具。声音和听写在本机处理。也可以直接输入日语走同一段对话。</p>`;
  }
  function summary() {
    const missed = needsPractice(run.records),
      independent = run.records.length - missed.length;
    const endLines = clip.length
      ? `<div class="talk-exit">${clip.map(optLine).join("")}${button("listen", "再听对方的回应")}</div>`
      : "";
    return `<h1>${run.items ? "重练结果" : "这段对话结束了"}</h1><section class="panel"><h2>${independent} / ${run.records.length} 句独立接上</h2><p>按你发送的日语、是否求助和跳过的轮次记录。识别错字可以修正。</p>${endLines}${
      missed.length
        ? `<h3>这次可以再练的句子</h3><ol class="talk-misses">${missed
            .map((r) => {
              const n = talks[scene].nodes[r.id],
                m =
                  n.edges.find((e) => e.model.jp === r.model)?.model ||
                  n.edges[0].model;
              return `<li><b>${n.title}</b> · ${r.flags.map((x) => names[x] || "使用辅助").join("、")}<p lang="ja">${ctx.esc(n.prompt.jp)}</p><p>${n.prompt.zh}</p>${r.text ? `<p>你最后发送了「${ctx.esc(r.text)}」。</p>` : ""}${r.attempt && r.attempt !== r.text ? `<p>当时没接上「${ctx.esc(r.attempt)}」。</p>` : ""}<p>一种接法　<span lang="ja">${ctx.esc(m.jp)}</span> · ${m.zh}</p></li>`;
            })
            .join("")}</ol>`
        : "<p>这次每句都接上了，可以换一种选择再聊。</p>"
    }${memoryNote ? `<p>${memoryNote}</p>` : ""}<div class="actions">${previous.length ? button("retry", "只重练待练的 " + previous.length + " 句", true) : ""}${button("start", "重聊整段")}<a class="tool" href="${route()}">换个场景</a></div></section>`;
  }
  function active() {
    const n = getNode(),
      b = busy(),
      status =
        {
          loading: "正在载入本机日语识别工具…",
          permission: "请允许浏览器使用麦克风。",
          listening: continuous
            ? "轮到你，直接说日语。句末停约一秒半即可。"
            : "正在听你说日语…",
          decoding: "正在本机整理听写…",
          playing: "对方正在说话…",
        }[phase] || "";
    const voiceButtons = continuous
      ? (confirming ? button("again", "重说本句", true) : "") +
        button("pause", "暂停连续对话")
      : (phase === "listening"
          ? button("finish", "说完了，查看听写", true)
          : button(
              "record",
              captured ? "重新开口" : "开口回答",
              true,
              b || !voiceAvailable(),
            )) +
        (b
          ? button("cancel", "取消这次录音")
          : button("type", typed ? "重新输入日语" : "用日语输入")) +
        (!b && voiceAvailable() ? button("resume", "继续免按对话") : "");
    const promptLine = showLine ? optLine(n.prompt) : "";
    const item = run.items?.[run.index];
    const trip =
      assignment?.trip || (assignment?.review && tripByChapter.get(item?.trip));
    const stop =
      trip &&
      trip.stops[
        entry().stop ?? trip.turns.find((t) => t.id === item.id)?.stop
      ];
    const idx = assignment?.trip
      ? "第 " +
        assignment.trip.week +
        " 周实战 · 第 " +
        (assignment.trip.turns.findIndex((t) => t.id === item.id) + 1) +
        " / " +
        assignment.trip.turns.length +
        " 轮"
      : assignment
        ? assignment.label + " · " + (run.index + 1) + " / " + run.items.length
        : run.items
          ? `重练 ${run.index + 1} / ${run.items.length}`
          : `对话 · 第 ${run.index + 1} 轮`;
    return `<h1>${ctx.esc(trip ? trip.title : partner().title)}</h1>${assignment?.trip ? itinerary(trip, item.stop) : ""}<section class="panel talk-round"><p class="small-label">${idx} · ${partnerRole()}</p><h2>${stop ? ctx.esc(stop.place) : "听完，用日语接话"}</h2>${stop ? '<p class="trip-setting">' + ctx.esc(assignment?.review && entry().choices?.[item.choice] ? "这次的任务：" + entry().choices[item.choice].ending + "。听对方换一种问法，再把这个决定告诉对方。" : entry().setting || stop.setting) + "</p>" : assignment ? '<p class="talk-goal">' + ctx.esc(entry().goal) + "</p>" : ""}${lastTurn?.skipped && !run.items ? `<p class="talk-last">这句先跳过，情景按「${ctx.esc(lastTurn.model)}」继续。</p>` : lastTurn?.text && !run.items ? `<p class="talk-last">你刚才说　<span lang="ja">${ctx.esc(lastTurn.text)}</span></p>` : ""}
   <div class="actions">${button("listen", phase === "playing" ? "重新播放" : heard ? "再听问题" : "听对方说", false, b)}${button("line", "看原句和中文", false, (!continuous && b) || showLine)}</div>${promptLine}
   <div class="talk-response"><div class="actions">${voiceButtons}</div>
   <p class="reading" role="status" aria-live="polite">${ctx.esc(status || notice || (!voiceAvailable() ? "当前环境无法开麦，可以直接输入日语。" : "也可以切到连续对话，说完停一下就能接着聊。"))}</p>
   ${typed && !b ? `<form data-talk-form><label for="talk-draft">${captured ? "听写结果，可改字" : "你的日语回答"}</label><div class="talk-send"><input id="talk-draft" data-talk-draft lang="ja" maxlength="160" autocomplete="off" value="${ctx.esc(draft)}"><button class="btn primary" data-action="talk-send" type="submit">${confirming ? "确认并接着聊" : "发送给" + partnerRole()}</button></div></form>` : ""}</div>
   <div class="actions">${button("hint", "卡住了，给个提示", false, (!continuous && b) || hint)}${button("skip", "这句先跳过", false, b)}</div>
   ${
     hint
       ? `<aside class="counter-hint"><p>${ctx.esc(n.hint)}</p>${button("examples", "再看参考说法", false, models || b)}${
           models
             ? n.edges
                 .filter(
                   (e, i, a) =>
                     a.findIndex((x) => x.model.jp === e.model.jp) === i,
                 )
                 .map(
                   (e) =>
                     `<div>${optLine(e.model)}<button type="button" class="tool" data-action="talk-model" data-index="${n.edges.indexOf(e)}" ${b ? "disabled" : ""}>听这句</button></div>`,
                 )
                 .join("")
             : ""
         }</aside>`
       : ""
   } </section>`;
  }
  function assignedView() {
    const a = assignment;
    const back = `<div class="crumb"><a href="#chapters">每日章节</a><span>›</span>${ctx.esc(a.label)}</div>`;
    if (run && !run.done)
      return (
        '<div class="inner narrow talk-page">' + back + active() + "</div>"
      );
    if (a.trip) {
      const t = a.trip,
        { records, complete } = a.progress();
      const missed = records.filter((r) => r.flags.length);
      const body = complete
        ? `<h1>本周小旅行完成</h1>${itinerary(t)}<section class="panel"><p class="small-label">第 ${t.week} 周 · ${ctx.esc(t.title)}</p><h2>${records.length - missed.length} / ${records.length} 轮独立接上</h2><p>${ctx.esc(t.finish)}</p>${t.outcome ? '<p class="trip-outcome"><b>' + (records.some((r) => r.skipped) ? "跳过选择后，行程按此继续：" : "你的选择：") + "</b>" + ctx.esc(t.outcome) + "。</p>" : ""}${
            missed.length
              ? '<h3>下次换个问法</h3><ul class="talk-misses">' +
                missed
                  .map((r) => {
                    const item = assignedEntry(r.id),
                      step = t.turns.find((v) => v.id === r.id);
                    return (
                      "<li><b>" +
                      ctx.esc(t.stops[step.stop].place) +
                      "</b> · " +
                      r.flags.map((f) => names[f]).join("、") +
                      '<p lang="ja">' +
                      ctx.esc(step.cue.jp) +
                      '</p><p>一种接法：<span lang="ja">' +
                      ctx.esc((item.answers?.[r.choice] || item).model.jp) +
                      "</span> · " +
                      ctx.esc((item.answers?.[r.choice] || item).model.zh) +
                      "</p></li>"
                    );
                  })
                  .join("") +
                "</ul><p>下个学习日优先换问法练这些句子，和章末复习合计最多五句。</p>"
              : "<p>每一站你都自己接上了。</p>"
          }<div class="actions"><a class="btn primary" href="${a.returnURL}">${a.returnLabel}</a>${button("trip-restart", "换个情况再走（选做）")}</div></section>`
        : `<h1>${ctx.esc(t.title)}</h1><p class="lead">${ctx.esc(t.intro)}</p>${itinerary(t)}<section class="practice-feature"><p class="small-label">第 ${t.week} 周 · 开口实战${t.encounter ? " · " + ctx.esc(t.encounter) : ""}</p><h2>${records.length ? "从上次停下的一站继续" : "先听，自己接话"}</h2><p>${records.length ? "已走完 " + records.length + " 轮，还有 " + a.items.length + " 轮。" : t.stops.length + " 站，" + t.turns.length + " 轮，约 " + t.minutes + " 分钟。"}听完日语，用这一周学过的话回应。遇到选择时，直接说你的决定，对方会顺着你的回答问下去。卡住再点提示。</p><div class="actions">${voiceAvailable() ? button("auto", "开启连续对话", true) : ""}${button("start", "逐句练习或输入日语", !voiceAvailable())}</div></section>`;
      return '<div class="inner narrow talk-page">' + back + body + "</div>";
    }
    const misses = run?.records.filter((r) => r.flags.length) || [];
    const body = run
      ? `<h1>${a.review ? "复习结束" : "章末对话完成"}</h1><div class="panel"><p>${run.records.length - misses.length} / ${run.records.length} 轮独立接上。</p>${
          misses.length
            ? `<h3>下个学习日换问法</h3><ul>${misses
                .map((r) => {
                  const t = assignedEntry(r.id);
                  return `<li>${ctx.esc(t.goal)}<p lang="ja">${ctx.esc((t.answers?.[r.choice] || t).model.jp)}</p></li>`;
                })
                .join("")}</ul>`
            : ""
        }<a class="btn primary" href="${a.returnURL}">${a.returnLabel}</a></div>`
      : `<h1>${ctx.esc(a.label)}</h1><section class="practice-feature"><h2>${ctx.esc(a.title)}</h2><p>${ctx.esc(a.intro)}</p><p>${a.items.length} 轮 · 约 ${a.review && a.items.length <= 3 ? 2 : 3} 分钟</p><div class="actions">${voiceAvailable() ? button("auto", "开启连续对话", true) : ""}${button("start", "逐句练习或输入日语", !voiceAvailable())}</div></section>`;
    return '<div class="inner narrow talk-page">' + back + body + "</div>";
  }
  function view() {
    if (assignment) return assignedView();
    return `<div class="inner narrow talk-page"><div class="crumb"><a href="#practice">练习室</a><span>›</span><a href="${route()}">开口对话</a></div>${!scene ? hub() : !run ? intro() : run.done ? summary() : active()}</div>`;
  }
  function handle(b) {
    const a = b.dataset.action.slice(5);
    sync();
    if (a === "trip-restart") {
      assignment?.restart?.();
      return;
    }
    if (a === "start" || a === "auto") {
      start(assignment?.items || null, a === "auto");
      return;
    }
    if (a === "retry" && previous.length) {
      start([...previous], preferredAuto);
      return;
    }
    if (!run) return;
    if (a === "pause") {
      stop();
      endVoice();
      typed = true;
      notice = "连续对话已暂停，可以输入或继续开口。";
      refresh();
      return;
    }
    if (a === "listen") {
      void play(run.done ? clip : [getNode().prompt]);
      return;
    }
    if (run.done) return;
    const n = getNode();
    if (a === "again" || a === "resume") {
      preferredAuto = true;
      continuous = true;
      confirming = false;
      typed = false;
      record();
      return;
    }
    if (continuous && ["hint", "line", "examples", "model"].includes(a)) {
      stop();
      endVoice();
      notice = "已暂停收音。准备好后可继续免按对话。";
    }
    if (a === "cancel") {
      stop();
      endVoice();
      typed = true;
      notice = "录音已取消。可以重新开口或输入日语。";
      refresh();
      return;
    }
    if (a === "finish") {
      capture?.finish();
      return;
    }
    if (busy()) return;
    if (a === "record") {
      record();
      return;
    }
    if (a === "send") {
      send();
      return;
    }
    if (a === "type") {
      stop();
      endVoice();
      typed = true;
      refresh("[data-talk-draft]");
      return;
    }
    if (a === "hint") {
      hint = true;
      noteSupport("hint");
    }
    if (a === "examples") {
      models = true;
      noteSupport("model");
    }
    if (a === "model") {
      const e = n.edges[Number(b.dataset.index)];
      if (e) void play([e.model]);
      return;
    }
    if (a === "line") {
      showLine = true;
      noteSupport("text");
    }
    if (a === "skip") {
      noteSupport("skip");
      const e =
        n.edges.find(
          (e) => !e.question && !["order", "takeCheck"].includes(e.next),
        ) || n.edges[0];
      advance(
        {
          next: e.next,
          replies: [],
          model: e.model.jp,
          choice: entry()?.choices ? e.choice : undefined,
        },
        { text: attempt, skipped: true },
      );
      return;
    }
    refresh();
  }
  function interrupt() {
    if (!scene || !run) return;
    sync();
    const wasBusy = busy() || continuous;
    stop();
    endVoice();
    if (wasBusy) {
      notice = "已停止录音。回到页面后可重新开口。";
      typed = true;
    }
    refresh();
  }
  return { view, enter, enterAssignment, leave, handle, send, interrupt };
}
