const library = new URL("./assets/asr/vosk-0.0.8.js", import.meta.url).href;
const modelFile = new URL("./assets/asr/ja-0.22.tar.gz", import.meta.url).href;
let scriptTask;
function loadScript() {
  if (!scriptTask) {
    scriptTask = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = library;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => {
        s.remove();
        scriptTask = null;
        reject(new Error("语音库加载失败，请检查网络再试。"));
      };
      document.head.append(s);
    });
  }
  return scriptTask;
}
const abortError = () => new DOMException("Cancelled", "AbortError");
function guard(signal) {
  if (signal.aborted) throw abortError();
}
export function createSpeechModel() {
  let model, ready, cancelLoad;
  function release() {
    cancelLoad?.();
    cancelLoad = null;
    // vosk-browser 0.0.8's queued terminate calls model.delete() in the
    // worker. During download there is no model yet; tear down that worker.
    if (model?.ready) model.terminate();
    else model?.worker.terminate();
    model = null;
    ready = null;
  }
  async function get() {
    if (ready) return ready;
    const task = (async () => {
      await loadScript();
      if (ready !== task) throw abortError();
      model = new globalThis.Vosk.Model(modelFile, -1);
      return await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () =>
            finish(
              false,
              new Error("语音模型加载超时，请重试或先用日语输入。"),
            ),
          120000,
        );
        let settled = false;
        function finish(success, why) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          cancelLoad = null;
          success ? resolve(model) : reject(why);
        }
        cancelLoad = () => finish(false, abortError());
        model.on("load", (m) =>
          finish(
            m.result,
            new Error("日语模型未能载入。请检查网络和浏览器存储空间。"),
          ),
        );
        model.on("error", () =>
          finish(false, new Error("日语模型未能载入。可重试或用日语输入。")),
        );
      });
    })();
    ready = task;
    try {
      return await task;
    } catch (e) {
      if (ready === task) release();
      throw e;
    }
  }
  return { get, release };
}

// A whole short utterance goes in one message. Wait for that message's result
// before flushing Kaldi, so a natural pause cannot consume the final callback.
export async function transcribe(model, samples, rate, signal) {
  guard(signal);
  const target = new OfflineAudioContext(
    1,
    Math.max(1, Math.ceil((samples.length * 16000) / rate)),
    16000,
  );
  const input = target.createBuffer(1, samples.length, rate);
  input.copyToChannel(samples, 0);
  const src = target.createBufferSource();
  src.buffer = input;
  src.connect(target.destination);
  src.start();
  const block = await target.startRendering();
  guard(signal);
  return new Promise((resolve, reject) => {
    const rec = new model.KaldiRecognizer(16000);
    let flushed = false,
      closed = false,
      parts = [];
    function finish(value, error) {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
      rec.remove();
      if (error) reject(error);
      else resolve(value);
    }
    function cancel() {
      finish("", abortError());
    }
    const timer = setTimeout(
      () => finish("", new Error("这次识别超时，可以再说一遍或输入日语。")),
      25000,
    );
    signal.addEventListener("abort", cancel, { once: true });
    function consume(m) {
      const text = m.result?.text?.replace(/\s+/gu, "") || "";
      if (text) parts.push(text);
      if (flushed) {
        finish(parts.join(""));
        return;
      }
      flushed = true;
      rec.retrieveFinalResult();
    }
    rec.on("result", consume);
    rec.on("partialresult", consume);
    rec.on("error", () =>
      finish("", new Error("本次语音识别未完成，请再试一次。")),
    );
    rec.acceptWaveform(block);
  });
}
export function voiceAvailable() {
  return !!(
    globalThis.isSecureContext &&
    navigator.mediaDevices?.getUserMedia &&
    globalThis.AudioContext &&
    globalThis.AudioWorkletNode &&
    globalThis.OfflineAudioContext &&
    globalThis.WebAssembly
  );
}
export function microphone(modelStore, { status, complete, fail }) {
  const controller = new AbortController(),
    signal = controller.signal;
  let context,
    stream,
    source,
    processor,
    blocks = [],
    sampleCount = 0,
    timer,
    flushTimer,
    active = false,
    finishing = false,
    model;
  function stopCapture() {
    clearTimeout(timer);
    clearTimeout(flushTimer);
    processor?.disconnect();
    source?.disconnect();
    stream?.getTracks().forEach((t) => t.stop());
    if (context && context.state !== "closed")
      void context.close().catch(() => {});
  }
  function cancel() {
    controller.abort();
    stopCapture();
    blocks = [];
  }
  function failure(e) {
    if (signal.aborted) return;
    cancel();
    fail(
      e.name === "NotAllowedError"
        ? "麦克风未获授权。可在浏览器里打开权限，或直接输入日语。"
        : e.name === "NotFoundError"
          ? "没有找到麦克风，可以直接输入日语。"
          : e.message || "没有收到录音，请重试。",
    );
  }
  async function decode() {
    if (!active || signal.aborted) return;
    active = false;
    const rate = context.sampleRate;
    stopCapture();
    try {
      if (!sampleCount) {
        complete("");
        return;
      }
      const samples = new Float32Array(sampleCount);
      let offset = 0,
        energy = 0;
      for (const b of blocks) {
        samples.set(b, offset);
        offset += b.length;
        for (const v of b) energy += v * v;
      }
      blocks = [];
      if (Math.sqrt(energy / samples.length) < 0.001) {
        complete("");
        return;
      }
      const text = await transcribe(model, samples, rate, signal);
      guard(signal);
      complete(text);
    } catch (e) {
      failure(e);
    }
  }
  function finish() {
    if (!active || finishing) return;
    finishing = true;
    clearTimeout(timer);
    status("decoding");
    processor.port.postMessage("finish");
    flushTimer = setTimeout(() => void decode(), 400);
  }
  async function begin() {
    try {
      context = new AudioContext();
      await context.resume();
      guard(signal);
      status("loading");
      model = await modelStore.get();
      guard(signal);
      status("permission");
      const acquired = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      if (signal.aborted) {
        acquired.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = acquired;
      await context.audioWorklet.addModule(
        new URL("./talk-mic-worklet.js", import.meta.url),
      );
      guard(signal);
      source = context.createMediaStreamSource(stream);
      processor = new AudioWorkletNode(context, "dialogue-capture", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        channelCount: 1,
        channelCountMode: "explicit",
      });
      processor.port.onmessage = (e) => {
        if (!active || signal.aborted) return;
        if (e.data === "done") {
          void decode();
          return;
        }
        blocks.push(e.data);
        sampleCount += e.data.length;
      };
      stream.getAudioTracks()[0].onended = () => {
        if (active && !finishing)
          failure(new Error("麦克风已断开，请重新开口。"));
      };
      active = true;
      source.connect(processor);
      processor.connect(context.destination);
      status("listening");
      timer = setTimeout(finish, 18000);
    } catch (e) {
      failure(e);
    }
  }
  void begin();
  return { finish, cancel };
}
