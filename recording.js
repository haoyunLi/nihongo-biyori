import { createTimingSession } from "./rhythm-client.js?v=7";
import { renderFeedback } from "./rhythm-feedback.js?v=7";
import { createExcerptPlayer } from "./excerpt-player.js";

// Only a user gesture inside the open panel starts microphone capture.
const micIcon =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4m-4 0h8"/></svg>';
const limit = 15;

export function recordingButton(
  esc,
  {
    jp,
    kana = "",
    audio = jp,
    learner = false,
    tip = "",
    compact = false,
    zh = "",
  },
) {
  const title = "跟读录音：" + jp;
  return `<button type="button" class="${compact ? "mic-icon" : "tool record-link"}" data-action="record-open" data-reference="${esc(jp)}" data-reading="${esc(kana)}" data-audio="${esc(audio)}" data-voice="${learner ? "learner" : "narrator"}" data-tip="${esc(tip)}" data-zh="${esc(zh)}" aria-label="${esc(title)}" title="${esc(title)}">${micIcon}${compact ? "" : " 录音对照"}</button>`;
}

export function createRecorder({ speak, stopAudio, silence, slow, notify }) {
  let panel,
    target,
    stream,
    recorder,
    clip = "",
    previousClip = "",
    timing,
    excerpt,
    excerptPreferences,
    result,
    previousResult,
    analysisRound = 0,
    timer,
    launch = 0,
    playback = 0,
    endPersonal;
  let state = "idle",
    listening = "",
    trigger = null;
  const el = (selector) => panel.querySelector(selector);
  const sayStatus = (text) => {
    el("[data-record-status]").textContent = text;
  };
  const supported = () =>
    Boolean(
      window.isSecureContext &&
        navigator.mediaDevices?.getUserMedia &&
        window.MediaRecorder,
    );

  function controls() {
    const busy = state !== "idle";
    el("[data-rhythm]").hidden = busy || !clip;
    el('[data-rec="capture"]').textContent =
      state === "request"
        ? "正在请求麦克风"
        : state === "recording"
          ? "停止录音"
          : state === "finishing"
            ? "正在整理录音"
            : clip
              ? "重新录音"
              : "开始录音";
    el('[data-rec="capture"]').disabled =
      !supported() || state === "request" || state === "finishing";
    el('[data-rec="retry-rhythm"]').disabled = busy || !supported();
    el('[data-rec="previous"]').hidden = !previousClip;
    for (const key of ["reference", "mine", "both", "previous"]) {
      const b = el(`[data-rec="${key}"]`);
      b.disabled =
        busy ||
        (key === "previous" ? !previousClip : key !== "reference" && !clip);
      b.textContent = listening === key ? "停止播放" : b.dataset.idle;
    }
  }
  function stopTracks() {
    clearInterval(timer);
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  }
  function stopListening() {
    playback++;
    excerpt?.stop();
    stopAudio();
    endPersonal?.();
    endPersonal = null;
    listening = "";
  }
  function clearFeedback() {
    excerpt?.destroy();
    excerpt = null;
    // The same retry control sits beside the active excerpt or below a
    // general result. Keep it when replacing the previous attempt's DOM.
    el("[data-rhythm]").append(el('[data-rec="retry-rhythm"]'));
    el("[data-feedback]").replaceChildren();
  }
  function release() {
    launch++;
    stopListening();
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* Device already ended. */
      }
    }
    stopTracks();
    recorder = null;
    analysisRound++;
    clearFeedback();
    timing?.close();
    timing = null;
    result = previousResult = null;
    if (clip) URL.revokeObjectURL(clip);
    if (previousClip) URL.revokeObjectURL(previousClip);
    clip = previousClip = "";
    el("[data-rhythm]").hidden = true;
    target = null;
    state = "idle";
  }
  function close() {
    if (!target) return;
    release();
    if (panel.open) panel.close();
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    trigger = null;
  }
  function init() {
    panel = document.createElement("dialog");
    panel.className = "record-panel";
    panel.setAttribute("aria-labelledby", "record-heading");
    panel.innerHTML = `<div class="record-header"><h2 id="record-heading">跟读录音对照</h2><button type="button" class="tool" data-rec="close">关闭</button></div>
      <div class="reference-line"><strong lang="ja" data-record-jp></strong><p class="reading" lang="ja" data-record-kana></p><p data-record-zh></p></div>
      <p data-record-tip></p><div class="actions"><button class="tool" data-rec="reference" data-idle="听示范">听示范</button><button class="btn primary" data-rec="capture">开始录音</button><span class="record-time" aria-hidden="true" data-record-time></span></div>
      <div class="actions take-controls"><button class="tool" data-rec="mine" data-idle="听自己的录音">听自己的录音</button><button class="tool" data-rec="both" data-idle="依次听示范和自己">依次听示范和自己</button><button class="tool" data-rec="previous" data-idle="听上一遍" hidden>听上一遍</button></div>
      <p class="record-status" role="status" data-record-status></p>
      <section class="rhythm-feedback" aria-label="跟读节奏反馈" data-rhythm hidden><div data-feedback aria-live="polite"></div><button class="tool rhythm-retry" type="button" data-rec="retry-rhythm" hidden>按提示重读</button></section>
      <p class="record-note">每遍最多 15 秒。录音和节奏分析只在本机进行，关闭窗口即清除。最多可回听最近两遍。</p>`;
    document.body.append(panel);
    panel.addEventListener("cancel", (e) => {
      e.preventDefault();
      close();
    });
    panel.addEventListener("close", () => {
      if (!panel.open && target) release();
    });
    panel.addEventListener("click", (e) => {
      const beat = e.target.closest("[data-beat]");
      if (beat && state === "idle" && excerpt) {
        const details = beat.closest("details");
        if (details) details.open = false;
        excerpt.select(Number(beat.dataset.beat), true, Boolean(details));
        return;
      }
      const key = e.target.closest("[data-rec]")?.dataset.rec;
      if (key === "close") close();
      else if (key === "capture") {
        if (state === "recording") finishCapture();
        else if (state === "idle") void capture();
      } else if (key === "retry-rhythm" && state === "idle") void capture();
      else if (["reference", "mine", "both", "previous"].includes(key))
        void play(key);
    });
  }
  function open(button) {
    if (!panel) init();
    if (typeof panel.showModal !== "function") {
      notify("当前浏览器不支持录音面板，可以继续使用课程示范。");
      return;
    }
    close();
    silence();
    trigger = button;
    target = { ...button.dataset };
    timing = createTimingSession(target);
    excerptPreferences = {
      context: true,
      rate: slow() ? 0.75 : 1,
      loop: false,
    };
    el("[data-rhythm]").hidden = true;
    el('[data-rec="retry-rhythm"]').hidden = true;
    el("[data-record-jp]").textContent = target.reference;
    el("[data-record-kana]").textContent =
      target.reading !== target.reference ? target.reading : "";
    el("[data-record-zh]").textContent = target.zh;
    el("[data-record-tip]").textContent =
      target.tip ||
      "先听示范，再把这句话完整读一遍。回听时，留意每个音占了几拍，以及句尾在哪里停下。";
    el("[data-record-time]").textContent = "";
    sayStatus(
      supported()
        ? "准备好后点「开始录音」。"
        : "当前环境无法使用麦克风。可继续听示范，或在支持录音的浏览器中打开本页。",
    );
    controls();
    panel.showModal();
  }
  async function analyze(blob, slowMode) {
    const round = ++analysisRound;
    clearFeedback();
    el("[data-rhythm]").hidden = false;
    const feedback = el("[data-feedback]");
    const retry = el('[data-rec="retry-rhythm"]');
    feedback.textContent = "正在本机比对示范和这遍的节奏…";
    feedback.setAttribute("aria-busy", "true");
    retry.hidden = true;
    const measured = await timing.analyze(blob, slowMode);
    if (round !== analysisRound || !target) return;
    result = measured;
    const host = renderFeedback(feedback, result, previousResult);
    if (host && timing.samples) {
      excerpt = createExcerptPlayer(
        host,
        result.units,
        timing.samples,
        excerptPreferences,
        () => {
          stopListening();
          controls();
          sayStatus("");
        },
        retry,
      );
      const focus = result.target ?? previousResult?.target;
      if (Number.isInteger(focus) && result.units[focus]?.reliable)
        excerpt.select(focus);
    }
    feedback.setAttribute("aria-busy", "false");
    retry.hidden = false;
    retry.textContent = result.units?.[result.target]
      ? "按提示重读"
      : "再读一遍";
    controls();
  }
  function finishCapture() {
    if (state !== "recording") return;
    state = "finishing";
    controls();
    try {
      if (recorder.state !== "inactive") recorder.stop();
    } catch {
      launch++;
      recorder = null;
      state = "idle";
      el("[data-record-time]").textContent = "";
      sayStatus("设备已停止录音。可以再录一次。");
      controls();
    } finally {
      stopTracks();
    }
  }
  function errorMessage(err) {
    if (err.name === "NotAllowedError" || err.name === "SecurityError")
      return "麦克风权限未开启。你可以继续听示范，或在浏览器的网站设置中允许麦克风后重试。";
    if (err.name === "NotFoundError")
      return "没有找到麦克风。接入设备后可以重试。";
    if (err.name === "NotReadableError")
      return "暂时无法读取麦克风，请检查设备或关闭占用麦克风的应用后重试。";
    return "这次录音未成功，请检查麦克风再试。";
  }
  async function capture() {
    stopListening();
    const ticket = ++launch;
    const slowMode = slow();
    state = "request";
    controls();
    sayStatus("请在浏览器提示中选择麦克风权限。");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (ticket !== launch) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = media;
      const type = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((t) => MediaRecorder.isTypeSupported?.(t));
      const rec = new MediaRecorder(
        stream,
        type ? { mimeType: type } : undefined,
      );
      recorder = rec;
      const chunks = [];
      rec.ondataavailable = (e) => {
        if (ticket === launch && e.data.size) chunks.push(e.data);
      };
      rec.onerror = () => {
        if (ticket !== launch) return;
        launch++;
        stopTracks();
        recorder = null;
        state = "idle";
        el("[data-record-time]").textContent = "";
        sayStatus("录音中断。请检查设备后重试。");
        controls();
      };
      rec.onstop = () => {
        if (ticket !== launch) return;
        stopTracks();
        recorder = null;
        state = "idle";
        el("[data-record-time]").textContent = "";
        if (chunks.length) {
          if (previousClip) URL.revokeObjectURL(previousClip);
          previousClip = clip;
          previousResult = result;
          result = null;
          const blob = new Blob(chunks, {
            type: rec.mimeType || chunks[0].type,
          });
          clip = URL.createObjectURL(blob);
          sayStatus("录好了。可以回听这一遍。");
          void analyze(blob, slowMode);
        } else sayStatus("没有收到录音，请再试一次。");
        controls();
      };
      stream.getAudioTracks()[0]?.addEventListener(
        "ended",
        () => {
          if (ticket === launch) finishCapture();
        },
        { once: true },
      );
      rec.start();
      state = "recording";
      controls();
      sayStatus("正在录音，请开口跟读。");
      const start = performance.now();
      function tick() {
        const t = Math.floor((performance.now() - start) / 1000);
        el("[data-record-time]").textContent =
          Math.min(t, limit) + " / " + limit + " 秒";
        if (t >= limit) finishCapture();
      }
      tick();
      timer = setInterval(tick, 200);
    } catch (err) {
      if (ticket !== launch) return;
      stopTracks();
      recorder = null;
      state = "idle";
      el("[data-record-time]").textContent = "";
      sayStatus(errorMessage(err));
      controls();
    }
  }
  function personal(url) {
    return new Promise((resolve, reject) => {
      const a = new Audio(url);
      function done(error) {
        a.onended = null;
        a.onerror = null;
        a.pause();
        if (endPersonal === cancel) endPersonal = null;
        if (error) reject(error);
        else resolve();
      }
      const cancel = () => done();
      endPersonal = cancel;
      a.onended = cancel;
      a.onerror = () => done(new Error("这段录音无法回放，请重新录制。"));
      a.play().catch(() => done(new Error("浏览器未能播放录音，请再点一次。")));
    });
  }
  async function play(mode) {
    if (state !== "idle") return;
    const same = listening === mode;
    stopListening();
    if (same) {
      controls();
      sayStatus("播放已停止。");
      return;
    }
    const ticket = playback;
    listening = mode;
    controls();
    try {
      if (mode === "reference" || mode === "both") {
        sayStatus("正在播放示范。");
        await speak(
          target.audio,
          slow(),
          target.reading,
          target.voice === "learner",
        );
      }
      if (ticket !== playback) return;
      if (mode !== "reference") {
        sayStatus("正在回放你的录音。");
        await personal(mode === "previous" ? previousClip : clip);
      }
      if (ticket === playback) sayStatus("播放结束。");
    } catch (err) {
      if (ticket === playback) sayStatus(err.message);
    } finally {
      if (ticket === playback) {
        listening = "";
        controls();
      }
    }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && target) close();
  });
  window.addEventListener("pagehide", close);
  return { open, close };
}
