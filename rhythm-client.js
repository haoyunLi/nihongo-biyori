import { clipStem } from "./clip-source.js";

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
  let reference,
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
  async function analyze(blob, slow) {
    if (!stem) return unavailable("reference");
    const id = ++number;
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
      if (!worker) {
        worker = new Worker(new URL("./rhythm-worker.js", import.meta.url), {
          type: "module",
        });
        worker.onmessage = ({ data }) => {
          if (pending?.id === data.id) finish(data.result);
        };
        worker.onerror = stop;
      }
      return await new Promise((resolve) => {
        pending = { id, resolve, timer: setTimeout(stop, 30000) };
        const sample = ref.slice();
        worker.postMessage(
          {
            id,
            stem,
            reading: target.reading || target.reference,
            slow,
            reference: sample,
            take,
          },
          [sample.buffer, take.buffer],
        );
      });
    } catch (e) {
      if (id === number) finish(unavailable());
      return unavailable(
        e.message === "reference" ? "reference" : "unavailable",
      );
    }
  }
  return {
    analyze,
    close() {
      closed = true;
      number++;
      controller.abort();
      stop();
      reference = null;
    },
  };
}
