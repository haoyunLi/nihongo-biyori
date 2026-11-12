import { excerptWindow, excerptWave } from "./rhythm-excerpt.js";

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
    <div class="excerpt-order"><span data-voice="reference">示范</span> → <span data-voice="take">我的录音</span></div>
    <div class="excerpt-settings">
      <label>范围<select data-scope><option value="context">带前后各两拍</option><option value="beat">只听选中拍</option></select></label>
      <label>速度<select data-rate><option value="1">原速 1×</option><option value=".75">慢放 0.75×</option></select></label>
      <label class="excerpt-loop"><input type="checkbox" data-loop>循环</label>
    </div>
    <div class="excerpt-transport"><button class="tool" type="button" data-excerpt-play>播放片段</button></div>
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
  let selected = null,
    range,
    audio,
    url,
    wave,
    timer,
    active = false,
    playId = 0;
  function showPhase() {
    const t = audio?.currentTime ?? 0;
    const phase = !active
      ? ""
      : t < wave.referenceEnd
        ? "reference"
        : t >= wave.takeStart && t < wave.takeEnd
          ? "take"
          : "";
    if (host.dataset.phase !== phase) host.dataset.phase = phase;
    // The focus stays marked. Outline it as the sound passes through it
    // on each speaker's timeline, including when the native player loops.
    const focus = units[selected];
    let sounding = false;
    if (phase === "reference") {
      const ms = range.reference[0] + t * 1000;
      sounding = ms >= focus.referenceStart && ms < focus.referenceEnd;
    } else if (phase === "take") {
      const ms = range.take[0] + (t - wave.takeStart) * 1000;
      sounding = ms >= focus.start && ms < focus.end;
    }
    host.toggleAttribute("data-sounding", sounding);
  }
  function stop() {
    playId++;
    active = false;
    clearInterval(timer);
    audio?.pause();
    button.textContent = "播放片段";
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
  function showError() {
    error.textContent =
      "这段暂时无法播放。可以点「播放片段」重试，或在上方回听整句。";
    error.hidden = false;
  }
  function play() {
    beforePlay();
    const id = ++playId;
    error.hidden = true;
    try {
      if (!audio) {
        wave = excerptWave(samples, range);
        audio = new Audio();
        url = URL.createObjectURL(wave.blob);
        audio.src = url;
        audio.onended = () => {
          if (audio?.ended) stop();
        };
        audio.onerror = () => {
          discard();
          showError();
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
          showError();
        }
      });
    } catch {
      discard();
      showError();
    }
  }
  function display(index) {
    const next = excerptWindow(units, index, preferences.context);
    if (!next) return false;
    discard();
    selected = index;
    range = next;
    error.hidden = true;
    host.hidden = false;
    el(".excerpt-transport").append(retryButton);
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
    stop,
    destroy: discard,
  };
}
