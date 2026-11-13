import {
  families,
  guided,
  mixed,
  replies,
  availableExample,
} from "./counter-data.js";
import { chapterOf } from "./chapter-path.js?v=13";

const keys = Object.keys(families);
export const validCounter = (part) =>
  !part ||
  part === "mixed" ||
  part === "lunch" ||
  Object.hasOwn(families, part);
const url = (key) => "#practice/counter" + (key ? "/" + key : "");
const lessonURL = ([id, n]) => "#lesson/" + id + "/" + n;
const buttons = (action, label, primary = false, disabled = false) =>
  `<button type="button" class="${primary ? "btn primary" : "tool"}" data-action="counter-${action}" ${disabled ? "disabled" : ""}>${label}</button>`;
const alternative = {
  order: "如果暂时说不出菜名，可以指菜单说「これを一つください」。",
  count: "已经指明食物时，说「二つください」也能表达两份。",
  place:
    "「こちらで」表示在这里。「テイクアウト」和「持ち帰り」都表示外带。店员可能只提一种，直接报自己的选择最清楚。",
  drink: "ドリンク也是饮料。听到这个词，就可以沿用「コーヒーをください」。",
  pay: "付款时说「カードで」或「現金で」，对方也能听明白。顾客想先问能否刷卡，可以说「カードは使えますか」。",
  stock:
    "留心结尾。还有（あります／ございます）时照原计划点；没有（ありません／ございません）或卖完时，用「じゃあ」换一道菜。",
};
const replyRole = {
  curry: "说菜名和份数",
  fish: "点鱼套餐",
  change: "改点咖喱",
  two: "报数量",
  coffee: "点饮料",
  in: "选择堂食",
  out: "选择外带",
  card: "选择刷卡",
  cash: "选择现金",
};
const byText = new Map(
  Object.entries(replies).map(([id, v]) => [
    v.jp,
    { ...v, role: replyRole[id] },
  ]),
);

function shuffle(items, rng = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function counterRound(previous = [], rng = Math.random, groups = keys) {
  return shuffle(groups, rng).map((key) => {
    const options = mixed.filter(
      (q) => q.family === key && !previous.includes(q.id),
    );
    return options[Math.floor(rng() * options.length)];
  });
}
export function counterLessonLinks(id, step) {
  if (id === "t09" && (step === undefined || step === 2))
    return `<a class="btn" href="${url("mixed")}">换一组店员，听六轮接话 →</a>`;
  const checkpoint =
    step !== undefined
      ? ""
      : id === "t04"
        ? '<a class="btn" href="#practice/counter/lunch">用本章所学混听三轮 →</a>'
        : id === "t07"
          ? '<a class="btn" href="#practice/counter/mixed">把第14至17章混起来听 →</a>'
          : "";
  return (
    checkpoint +
    keys
      .filter(
        (k) =>
          families[k].step[0] === id &&
          (step === undefined || families[k].step[1] === step),
      )
      .map(
        (k) =>
          `<a class="tool" href="${url(k)}">听店员换个问法 · ${families[k].name} →</a>`,
      )
      .join("")
  );
}

export function counterLessonBlock(id, step, soundButton) {
  const key = keys.find(
    (k) => families[k].step[0] === id && families[k].step[1] === step,
  );
  if (!key) return counterLessonLinks(id, step);
  const family = families[key],
    cue = family.examples[0],
    reply = replies[family.reply];
  return `<aside class="counter-lesson"><h3>换你在柜台接一句</h3><p>听店员说　<span lang="ja">${cue.jp}</span> ${soundButton(cue.jp, "听店员的问法", cue.kana)}</p><p class="reading" lang="ja">${cue.kana}</p><p>${cue.zh} ${family.clue}</p><p>试着回答　<span lang="ja">${reply.jp}</span> ${soundButton(reply.jp, "听顾客的回答", reply.kana)}</p><p class="reading">${reply.kana} · ${reply.zh}</p>${counterLessonLinks(id, step)}</aside>`;
}
export function createCounter(ctx) {
  let section,
    queue,
    index,
    scores,
    card,
    prior = { mixed: [], lunch: [] },
    token = 0;
  function start(items) {
    queue = items;
    index = 0;
    scores = [];
    nextCard();
  }
  function nextCard() {
    card = {
      heard: false,
      playing: false,
      help: false,
      transcript: false,
      choices: false,
      wrong: new Set(),
      right: false,
      error: "",
      order: queue[index] ? shuffle(queue[index].options.map((_, i) => i)) : [],
    };
  }
  function restart() {
    const items = counterRound(
      prior[section],
      Math.random,
      section === "lunch" ? ["order", "count", "place"] : keys,
    );
    prior[section] = items.map((item) => item.id);
    start(items);
  }
  function enter(key) {
    section = key;
    queue = null;
    card = null;
    if (key === "mixed" || key === "lunch") restart();
  }
  function sample(v) {
    return `<div class="counter-line"><div><strong lang="ja">${ctx.esc(v.jp)}</strong><p class="reading" lang="ja">${ctx.esc(v.kana)}</p><p>${ctx.esc(v.zh)}</p></div>${ctx.soundButton(v.jp, "听日语示范", v.kana)}</div>`;
  }
  const crumbs = `<div class="crumb"><a href="#practice">练习室</a><span>›</span><a href="#practice/counter">柜台换问法</a></div>`;
  function overview() {
    return `<h1>柜台换问法</h1><p class="lead">先把店员的两种问法连起来听，再合上文字，用已经会的日语接话。</p><section class="practice-feature"><h2>混合听六轮</h2><p>点菜、份数、用餐地点、饮料、付款和菜品有没有货，各听一题。先自己说，再核对店员问的是什么。</p><a class="btn primary" href="${url("mixed")}">开始混合接话 →</a> <a class="tool" href="#practice/talk/restaurant">从进店聊到结账</a> <a class="tool" href="#practice/counter/lunch">刚学完第14章？先听三轮</a></section><h2>按情境练</h2><div class="scene-list">${keys.map((k) => `<a class="scene-link" href="${url(k)}"><span>第 ${chapterOf(families[k].step[0])} 章</span><strong>${families[k].name}</strong><span>听两种问法 →</span></a>`).join("")}</div>`;
  }
  function guide() {
    const f = families[section];
    const second = { place: "in", pay: "cash", stock: "fish" }[section];
    return `<h1>${f.name}</h1><p class="lead">${f.clue}</p><section class="panel"><h2>先听两种说法</h2>${f.examples.map(sample).join("")}${section === "stock" ? `<h3>如果还有这道菜</h3>${sample(availableExample)}` : ""}<h3>你可以这样接</h3>${ctx.spokenModel(replies[f.reply])}${second ? ctx.spokenModel(replies[second]) : ""}<p>${alternative[section]}</p><div class="actions">${buttons("start", "合上文字，试着接话", true)}<a class="tool" href="${lessonURL(f.step)}">回第 ${chapterOf(f.step[0])} 章</a></div></section>`;
  }
  function result() {
    const independent = scores.filter((s) => s === "独立选对").length;
    const shortRound =
      section === "lunch" || families[section]?.step[0] === "t04";
    const drillRound = section === "mixed" || section === "lunch";
    const next = drillRound
      ? buttons("again", shortRound ? "换三句再练" : "换六句再练", true)
      : `<a class="btn primary" href="${url(shortRound ? "lunch" : "mixed")}">${shortRound ? "混听本章三种问法" : "试试混合接话"}</a>`;
    const returnTo = drillRound
      ? shortRound
        ? "#lesson/t04/2"
        : url()
      : lessonURL(families[section].step);
    return `<h1>这轮接话练完了</h1><section class="panel"><h2>${independent} / ${scores.length} 题独立选对</h2><p>首次选对且未用慢速、文字提示的题计入独立选对。说出口的回答可以对照示范自行核对。</p><ul class="counter-scores">${queue.map((q, i) => `<li><a href="${url(q.family)}">${families[q.family].name}</a><span>${scores[i]}</span></li>`).join("")}</ul><div class="actions">${next}<a class="tool" href="#review/mistakes">打开错题本</a><a class="tool" href="${returnTo}">${section === "mixed" ? "回情境列表" : "回到本章"}</a></div></section>`;
  }
  function challenge() {
    const q = queue[index],
      f = families[q.family];
    const options = card.order
      .map(
        (i) =>
          `<button type="button" class="answer ${card.wrong.has(i) ? "incorrect" : card.right && i === q.answer ? "correct" : ""}" data-action="counter-answer" data-index="${i}" ${card.right || card.wrong.has(i) ? "disabled" : ""}><span lang="ja">${ctx.esc(q.options[i])}</span>${card.readings ? `<small>${ctx.esc(byText.get(q.options[i]).kana)} · ${ctx.esc(byText.get(q.options[i]).zh)}</small>` : ""}</button>`,
      )
      .join("");
    const last = [...card.wrong].at(-1);
    return `<h1>${section === "mixed" ? "混合接话" : section === "lunch" ? "午餐柜台三轮" : "听完接一句"}</h1><section class="panel counter-task"><p class="small-label">柜台接话 · ${index + 1} / ${queue.length}</p><h2>轮到你当客人</h2><p class="counter-goal">${q.goal}</p><div class="actions">${buttons("listen", card.playing ? "播放中…" : card.heard ? "再听一遍" : "听店员说", !card.heard, card.playing)}${card.heard && !card.right ? buttons("slow", "没听清，慢听同一句", false, card.playing) : ""}${(card.heard || card.error) && !card.right && !card.transcript ? buttons("hint", "看原句和中文") : ""}</div>
    ${card.transcript ? `<div class="counter-hint"><strong lang="ja">${q.cue.jp}</strong><p>${q.cue.kana} · ${q.cue.zh}</p></div>` : ""}
    ${card.error ? `<p role="alert">${ctx.esc(card.error)}</p>` : ""}
    ${!card.choices ? `<p>${card.heard || card.transcript ? "先大声说你的回答。没听清时，试着说「もう一度お願いします」，再听一次。" : "先听问题，再大声说你会怎么回答。"}</p>${buttons("reveal", "我说好了，核对回答", true, !card.heard && !card.transcript)}` : `<h3>哪一句表达了你的回答？</h3><div class="answer-set">${options}</div>${!card.readings && !card.right ? buttons("readings", "看选项读音和中文") : ""}`}
    ${card.right ? `<div role="status" class="feedback"><strong>接上了 · ${f.name}</strong><p lang="ja">${q.cue.jp}</p><p>${q.cue.zh} 听「${q.cue.clue}」。</p></div>${ctx.spokenModel(q.model)}<p>${alternative[q.family]}</p>${buttons("next", index === queue.length - 1 ? "看本轮结果" : "听下一位店员", true)}` : last !== undefined ? `<p role="status" class="feedback error">你选的是「${byText.get(q.options[last]).role}」。听「${q.cue.clue}」：${q.cue.zh} 再按自己的计划答一次。</p>` : ""}</section>`;
  }
  function view() {
    const content = !section
      ? overview()
      : !queue
        ? guide()
        : index === queue.length
          ? result()
          : challenge();
    return `<div class="inner narrow counter-page">${crumbs}${content}</div>`;
  }
  function redraw(focus) {
    ctx.main.innerHTML = view();
    if (focus)
      (
        ctx.main.querySelector(
          '[data-action="counter-' + focus + '"]:not(:disabled)',
        ) || ctx.main
      ).focus({ preventScroll: true });
  }
  function stop() {
    token++;
    if (card?.playing) {
      card.playing = false;
      const b = ctx.main.querySelector('[data-action="counter-listen"]');
      if (b) {
        b.disabled = false;
        b.textContent = card.heard ? "再听一遍" : "听店员说";
      }
      const slow = ctx.main.querySelector('[data-action="counter-slow"]');
      if (slow) slow.disabled = false;
    }
  }
  async function listen(slow) {
    ctx.silence();
    const id = token,
      q = queue[index];
    card.playing = true;
    card.error = "";
    if (slow || ctx.slow()) card.help = true;
    redraw();
    try {
      await ctx.speak(q.cue.jp, slow || ctx.slow(), q.cue.kana);
      if (id === token) card.heard = true;
    } catch (error) {
      if (id === token) card.error = error.message;
    } finally {
      if (id === token) {
        card.playing = false;
        redraw(card.choices ? "answer" : card.heard ? "reveal" : "listen");
      }
    }
  }
  function handle(button) {
    const action = button.dataset.action.slice(8);
    if (action === "listen" || action === "slow") {
      void listen(action === "slow");
      return;
    }
    ctx.silence();
    if (action === "start") {
      start([guided.find((q) => q.family === section)]);
      redraw("listen");
      return;
    }
    if (action === "again") {
      restart();
      redraw("listen");
      return;
    }
    if (!queue || index >= queue.length) return;
    const q = queue[index];
    if (action === "hint" && (card.heard || card.error)) {
      card.help = true;
      card.transcript = true;
      redraw("reveal");
    }
    if (action === "readings" && card.choices) {
      card.help = true;
      card.readings = true;
      redraw("answer");
    }
    if (action === "reveal" && (card.heard || card.transcript)) {
      card.choices = true;
      redraw("answer");
    }
    if (action === "answer" && card.choices && !card.right) {
      const i = Number(button.dataset.index);
      if (!q.options[i] || card.wrong.has(i)) return;
      if (i === q.answer) card.right = true;
      else {
        card.wrong.add(i);
        ctx.noteMiss("counter:" + q.id, q.options[i]);
      }
      redraw(card.right ? "next" : "listen");
    }
    if (action === "next" && card.right) {
      scores.push(
        card.wrong.size
          ? "答错后重试"
          : card.help
            ? "借助提示选对"
            : "独立选对",
      );
      index++;
      nextCard();
      redraw(index === queue.length ? "again" : "listen");
    }
  }
  return { enter, view, handle, stop };
}
