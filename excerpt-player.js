import { excerptWindow, excerptWave } from "./rhythm-excerpt.js?v=8";

export function createExcerptPlayer(
  host,
  units,
  samples,
  preferences,
  beforePlay,
  retryButton,
) {
  host.innerHTML = `<div class="excerpt-heading"><strong>片段对照</strong><span data-range></span></div>
    <p class="excerpt-kana" lang="ja" data-kana></p>
    <p class="excerpt-hint" data-hint hidden></p>
    <div class="excerpt-order"><span data-voice="reference">示范</span> → <span data-middle hidden><span data-voice="previous">上一遍</span> → </span><span data-voice="take">我的录音</span></div>
    <div class="excerpt-settings">
      <label>范围<select data-scope><option value="context">带前后各两拍</option><option value="beat">只听选中拍</option></select></label>
      <label>速度<select data-rate><option value="1">原速 1×</option><option value=".75">慢放 0.75×</option></select></label>
      <label class="excerpt-loop"><input type="checkbox" data-loop>循环</label>
    </div>
    <div class="excerpt-transport"><button class="tool" type="button" data-excerpt-play>播放片段</button><button class="tool" type="button" data-rec="capture-part">只重读这段</button></div>
    <p class="part-status" role="status" data-part-status hidden></p><span class="record-time" aria-hidden="true" data-part-time></span><p class="part-comparison" data-part-comparison hidden></p>
    <p class="excerpt-error" role="status" data-error hidden></p>`;
  host.setAttribute("aria-label", "片段对照");
  host.setAttribute("aria-live", "off");
  const el = (selector) => host.querySelector(selector);
  const scope = el("[data-scope]"),
    rate = el("[data-rate]"),
    loop = el("[data-loop]");
  const button = el("[data-excerpt-play]"),
    hint = el("[data-hint]"),
    error = el("[data-error]");
  scope.value = preferences.context ? "context" : "beat";
  rate.value = preferences.rate === 1 ? "1" : ".75";
  loop.checked = preferences.loop;
  const history = new Map();
  const partButton = el('[data-rec="capture-part"]'),
    captureStatus = el("[data-part-status]"),
    comparison = el("[data-part-comparison]");
  let attempts = [],
    key,
    selected = null,
    range,
    audio,
    url,
    wave,
    timer,
    active = false,
    playId = 0;
  function showPhase() {
    const t = audio?.currentTime ?? 0;
    const phase = active && wave.phases.find((p) => t >= p.start && t < p.end);
    host.dataset.phase = phase?.voice || "";
    let sounding = false;
    if (phase) {
      const focus = phase.attempt
        ? phase.attempt.units?.find((u) => u.first === units[selected].first)
        : units[selected];
      if (focus?.reliable) {
        const time = phase.origin + (t - phase.start) * 1000;
        const demo = phase.voice === "reference";
        sounding =
          time >= (demo ? focus.referenceStart : focus.start) &&
          time < (demo ? focus.referenceEnd : focus.end);
      }
    }
    host.toggleAttribute("data-sounding", sounding);
  }
  function stop() {
    playId++;
    active = false;
    clearInterval(timer);
    audio?.pause();
    button.textContent = attempts.length ? "连听三遍" : "播放片段";
    showPhase();
  }
  function discard() {
    stop();
    if (!audio) return;
    audio.onended = audio.onerror = null;
    audio.removeAttribute("src");
    audio.load();
    URL.revokeObjectURL(url);
    audio = wave = url = null;
  }
  function showError(auto = false) {
    error.textContent = auto
      ? "片段已录好，点「连听三遍」开始播放。"
      : "这段暂时无法播放，请再点一次播放按钮。";
    error.hidden = false;
  }
  function play(auto = false) {
    beforePlay();
    const id = ++playId;
    error.hidden = true;
    try {
      if (!audio) {
        wave = excerptWave(samples, range, attempts);
        audio = new Audio();
        url = URL.createObjectURL(wave.blob);
        audio.src = url;
        audio.onended = () => {
          if (audio?.ended) stop();
        };
        audio.onerror = () => {
          discard();
          showError(auto);
        };
      }
      audio.preservesPitch = true;
      if ("webkitPreservesPitch" in audio) audio.webkitPreservesPitch = true;
      audio.playbackRate = preferences.rate;
      audio.loop = preferences.loop;
      audio.currentTime = 0;
      active = true;
      button.textContent = "停止片段";
      showPhase();
      timer = setInterval(showPhase, 25);
      audio.play().catch(() => {
        if (id === playId) {
          discard();
          showError(auto);
        }
      });
    } catch {
      discard();
      showError(auto);
    }
  }
  function showAttempts() {
    attempts = history.get(key) || [];
    el("[data-middle]").hidden = !attempts.length;
    el('[data-voice="previous"]').textContent =
      attempts.length === 1 ? "上一遍（整句中）" : "上一遍";
    el('[data-voice="take"]').textContent = attempts.length
      ? "这一遍"
      : "我的录音";
    button.textContent = attempts.length ? "连听三遍" : "播放片段";
    comparison.hidden = !attempts.length;
    if (!attempts.length) return;
    const focus = units[selected],
      match = (a) => a?.units?.find((u) => u.first === focus.first);
    const current = attempts.at(-1);
    const now = match(current),
      previous = attempts.length === 2 ? match(attempts[0]) : focus;
    if (!now?.reliable || !previous?.reliable) {
      const guidance = {
        quiet: "这遍声音太轻，靠近麦克风再试。",
        noise: "这遍背景声较强，换个安静的位置再试。",
        closure: "单听「っ」很难量出停顿。带上前后拍再练，会更容易听清。",
      };
      comparison.textContent =
        guidance[current.reason] ||
        "有一遍的目标拍边界不够清楚，可以连听三遍，凭听感比较。";
      return;
    }
    const difference =
      Math.abs(previous.userMs - focus.refMs) -
      Math.abs(now.userMs - focus.refMs);
    const direction =
      difference > 30
        ? "这遍的拍长更接近示范。"
        : difference < -30
          ? "这遍和示范的时长差更大，可以再听一次。"
          : "两遍与示范的时长差别相近。";
    const ms = (n) => Math.round(n / 10) * 10;
    comparison.textContent =
      "「" +
      focus.labels.join("・") +
      "」按原速估计，示范约 " +
      ms(focus.refMs) +
      "、上一遍 " +
      ms(previous.userMs) +
      "、这一遍 " +
      ms(now.userMs) +
      " 毫秒。" +
      direction;
  }
  function selection() {
    if (selected === null) return null;
    return {
      key,
      index: selected,
      reference: range.reference,
      first: units[range.from].first,
      last: units[range.to].first,
      text: units
        .slice(range.from, range.to + 1)
        .flatMap((u) => u.labels)
        .join("・"),
    };
  }
  function captureState(state, part, supported) {
    const recording = part && state === "recording",
      busy = state !== "idle";
    partButton.disabled = !supported || (busy && !recording);
    partButton.textContent = recording ? "结束片段录音" : "只重读这段";
    button.disabled = scope.disabled = rate.disabled = loop.disabled = busy;
    captureStatus.hidden = !part || !busy;
    if (part && busy) {
      error.hidden = true;
      const text =
        state === "request"
          ? "正在请求麦克风…"
          : recording
            ? "只读「" + part.text + "」。读完点「结束片段录音」。"
            : "正在准备三遍对照…";
      if (text !== captureStatus.textContent) captureStatus.textContent = text;
    }
  }
  function display(index) {
    const next = excerptWindow(units, index, preferences.context);
    if (!next) return false;
    discard();
    selected = index;
    range = next;
    key = range.from + "-" + range.to;
    showAttempts();
    error.hidden = true;
    host.hidden = false;
    el(".excerpt-transport").append(retryButton);
    retryButton.textContent = "回到整句重读";
    const first = units[range.from],
      last = units[range.to];
    const start = first.first + 1,
      end = last.first + last.labels.length;
    el("[data-range]").textContent =
      start === end ? `第 ${start} 拍` : `第 ${start}–${end} 拍`;
    const kana = el("[data-kana]");
    kana.replaceChildren();
    for (let i = range.from; i <= range.to; i++) {
      if (i > range.from) kana.append("・");
      const part = document.createElement(i === index ? "mark" : "span");
      part.textContent = units[i].labels.join("・");
      kana.append(part);
    }
    let explanation = "";
    if (range.trimmed) explanation = "片段边缘有拍定位不稳，已缩短试听范围。";
    if (!preferences.context && units[index].phones.includes("q"))
      explanation = "「っ」单独听常像短暂停顿，带上前后拍更容易分辨。";
    hint.textContent = explanation;
    hint.hidden = !explanation;
    return true;
  }
  button.onclick = () => {
    if (active) stop();
    else play();
  };
  scope.onchange = () => {
    const resume = active;
    preferences.context = scope.value === "context";
    if (display(selected) && resume) play();
  };
  rate.onchange = () => {
    preferences.rate = Number(rate.value);
    if (audio) audio.playbackRate = preferences.rate;
  };
  loop.onchange = () => {
    preferences.loop = loop.checked;
    if (audio) audio.loop = preferences.loop;
  };
  return {
    select(index, autoplay = false, focus = false) {
      if (index !== selected && !display(index)) return;
      if (selected === null) return;
      if (autoplay) play();
      if (focus) button.focus();
    },
    selection,
    captureState,
    recordError(message) {
      error.textContent = message;
      error.hidden = false;
    },
    addAttempt(part, attempt) {
      if (key !== part.key) return;
      discard();
      history.set(key, [...attempts.slice(-1), attempt]);
      showAttempts();
      play(true);
    },
    stop,
    destroy() {
      discard();
      history.clear();
    },
  };
}
