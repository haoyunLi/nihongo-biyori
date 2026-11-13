import { endpoint } from "./talk-turn.js";
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
async function recognise(model, samples, rate, signal) {
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
    rec.setWords(true);
    const words = [];
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
      if (text) {
        parts.push(text);
        words.push(...(m.result?.result || []));
      }
      if (flushed) {
        finish({ text: parts.join(""), words });
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

export async function transcribe(model, samples, rate, signal) {
  return (await recognise(model, samples, rate, signal)).text;
}

// One permission grant and one stream per conversation. A disabled track
// and a disconnected input isolate the partner's audio from each answer.
export function createConversationMic(modelStore) {
  let context, stream, source, model, openTask, round;
  let generation = 0;
  function mute() {
    if (stream) for (const t of stream.getAudioTracks()) t.enabled = false;
    source?.disconnect();
  }
  function stopRound() {
    if (!round) return;
    round.controller.abort();
    clearTimeout(round.timer);
    clearTimeout(round.flushTimer);
    mute();
    round.processor?.disconnect();
    round.processor?.port.close();
    round = null;
  }
  function close() {
    generation++;
    stopRound();
    stream?.getTracks().forEach((t) => t.stop());
    if (context && context.state !== "closed")
      void context.close().catch(() => {});
    openTask = null;
    context = null;
    stream = null;
    source = null;
    model = null;
  }
  async function prepare(notify) {
    if (openTask) return openTask;
    const token = generation;
    const check = () => {
      if (token !== generation) throw abortError();
    };
    openTask = (async () => {
      context ||= new AudioContext();
      await context.resume();
      check();
      notify("loading");
      model = await modelStore.get();
      check();
      notify("permission");
      const acquired = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      if (token !== generation) {
        acquired.getTracks().forEach((t) => t.stop());
        throw abortError();
      }
      stream = acquired;
      mute();
      await context.audioWorklet.addModule(
        new URL("./talk-mic-worklet.js", import.meta.url),
      );
      check();
      source = context.createMediaStreamSource(stream);
      stream.getAudioTracks()[0].onended = () => {
        const fail = round?.fail;
        close();
        fail?.("麦克风已断开，请重新开口。");
      };
    })();
    return openTask;
  }
  function listen({ automatic, status, complete, fail }) {
    stopRound();
    const r = {
      controller: new AbortController(),
      blocks: [],
      samples: 0,
      reason: "manual",
      fail,
    };
    round = r;
    const signal = r.controller.signal;
    function failure(e) {
      if (signal.aborted) return;
      close();
      fail(
        e.name === "NotAllowedError"
          ? "麦克风未获授权。可打开权限或改用日语输入。"
          : e.name === "NotFoundError"
            ? "没有找到麦克风，可改用日语输入。"
            : e.message || "麦克风未能启动，请重试。",
      );
    }
    async function decode() {
      if (!r.processor || signal.aborted || r.decoding) return;
      r.decoding = true;
      clearTimeout(r.timer);
      clearTimeout(r.flushTimer);
      mute();
      r.processor.disconnect();
      r.processor.port.close();
      r.processor = null;
      try {
        let result = { text: "", words: [] };
        if (r.samples && r.reason !== "empty") {
          const data = new Float32Array(r.samples);
          let at = 0;
          for (const block of r.blocks) {
            data.set(block, at);
            at += block.length;
          }
          r.blocks = [];
          result = await recognise(model, data, context.sampleRate, signal);
        }
        guard(signal);
        round = null;
        complete(result, r.reason);
      } catch (e) {
        failure(e);
      }
    }
    function finish(reason = "manual") {
      if (!r.processor || r.finishing || signal.aborted) return;
      r.finishing = true;
      r.reason = reason;
      clearTimeout(r.timer);
      status("decoding");
      r.processor.port.postMessage("finish");
      r.flushTimer = setTimeout(() => void decode(), 400);
    }
    async function begin() {
      try {
        await prepare(status);
        guard(signal);
        if (!stream || !stream.active)
          throw new Error("麦克风已断开，请重试。");
        await context.resume();
        guard(signal);
        const detect = endpoint(context.sampleRate);
        r.processor = new AudioWorkletNode(context, "dialogue-capture", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
          channelCount: 1,
          channelCountMode: "explicit",
        });
        r.processor.port.onmessage = (e) => {
          if (signal.aborted || r.decoding) return;
          if (e.data === "done") {
            void decode();
            return;
          }
          r.blocks.push(e.data);
          r.samples += e.data.length;
          if (automatic && !r.finishing) {
            const state = detect(e.data);
            if (state === "end" || state === "empty" || state === "limit")
              finish(state);
          }
        };
        source.connect(r.processor);
        r.processor.connect(context.destination);
        stream.getAudioTracks()[0].enabled = true;
        status("listening");
        r.timer = setTimeout(
          () => finish(automatic ? "limit" : "manual"),
          automatic ? 29000 : 18000,
        );
      } catch (e) {
        failure(e);
      }
    }
    void begin();
    return {
      finish,
      cancel: () => {
        if (round === r) stopRound();
      },
    };
  }
  function unlock() {
    try {
      context ||= new AudioContext();
      void context.resume().catch(() => {});
    } catch {
      /* prepare reports device errors on the listening turn */
    }
  }
  return { listen, close, unlock };
}
