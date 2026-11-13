import { cut } from "./rhythm-excerpt.js?v=8";
import { clipStem } from "./clip-source.js?v=11";

const unavailable = (reason = "unavailable") => ({
  status: "uncertain",
  reason,
});

async function decode(bytes) {
  const Context =
    globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!Context) throw new Error("decode");
  const context = new Context(1, 1, 16000);
  const audio = await context.decodeAudioData(bytes);
  if (audio.duration > 18 || audio.sampleRate !== 16000)
    throw new Error("decode");
  const mono = new Float32Array(audio.length);
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const channel = audio.getChannelData(c);
    for (let i = 0; i < mono.length; i++)
      mono[i] += channel[i] / audio.numberOfChannels;
  }
  return mono;
}

// One session per open exercise. Only the public example is fetched. Both PCM
// buffers go to a same-origin dedicated worker through postMessage.
export function createTimingSession(target) {
  const stem = clipStem(
    target.audio,
    target.reading,
    target.voice === "learner",
  );
  const controller = new AbortController();
  let samples,
    reference,
    worker,
    pending,
    number = 0,
    closed = false;
  function finish(result) {
    if (!pending) return;
    clearTimeout(pending.timer);
    pending.resolve(result);
    pending = null;
  }
  function stop() {
    worker?.terminate();
    worker = null;
    finish(unavailable());
  }
  function run(id, ref, take, slow, part) {
    if (!worker) {
      worker = new Worker(new URL("./rhythm-worker.js?v=11", import.meta.url), {
        type: "module",
      });
      worker.onmessage = ({ data }) => {
        if (pending?.id === data.id) finish(data.result);
      };
      worker.onerror = stop;
    }
    return new Promise((resolve) => {
      pending = { id, resolve, timer: setTimeout(stop, 30000) };
      // Clone into the worker so the main thread keeps the matching PCM for excerpts.
      worker.postMessage({
        id,
        stem,
        reading: target.reading || target.reference,
        slow,
        part,
        reference: ref,
        take,
      });
    });
  }
  async function analyzePart(blob, selection) {
    const id = ++number;
    finish(unavailable());
    let pcm;
    try {
      pcm = await decode(await blob.arrayBuffer());
      if (closed || id !== number || !samples) return null;
      const ref = cut(samples.reference, selection.reference);
      const result = await run(id, ref, pcm, false, {
        first: selection.first,
        last: selection.last,
      });
      if (closed || id !== number) return null;
      const units = result.units;
      const bounds = units
        ? [units[0].start, units.at(-1).end]
        : [0, pcm.length / 16];
      return { pcm, bounds, units, reason: result.reason };
    } catch {
      if (id === number) finish(unavailable());
      return pcm && !closed && id === number
        ? { pcm, bounds: [0, pcm.length / 16], reason: "unavailable" }
        : null;
    }
  }
  async function analyze(blob, slow) {
    if (!stem) return unavailable("reference");
    const id = ++number;
    samples = null;
    finish(unavailable());
    try {
      reference ??= fetch(
        new URL("./assets/audio/" + stem + ".mp3?v=3", import.meta.url),
        { signal: controller.signal },
      )
        .then((r) => {
          if (!r.ok) throw new Error("reference");
          return r.arrayBuffer();
        })
        .then(decode)
        .catch(() => {
          reference = null;
          throw new Error("reference");
        });
      const [ref, take] = await Promise.all([
        reference,
        blob.arrayBuffer().then(decode),
      ]);
      if (closed || id !== number) return unavailable();
      const result = await run(id, ref, take, slow);
      if (!closed && id === number && result.status === "measured")
        samples = { reference: ref, take };
      return result;
    } catch (e) {
      if (id === number) finish(unavailable());
      return unavailable(
        e.message === "reference" ? "reference" : "unavailable",
      );
    }
  }
  return {
    analyze,
    analyzePart,
    get samples() {
      return samples;
    },
    close() {
      closed = true;
      samples = null;
      number++;
      controller.abort();
      stop();
      reference = null;
    },
  };
}
