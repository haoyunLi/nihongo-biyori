// Both inputs are the mono PCM used for alignment. The measured boundaries
// are in milliseconds on each recording's own timeline, including lead-in.
const sampleRate = 16000;

export function excerptWindow(units, index, context = true) {
  const focus = units[index];
  if (!focus?.reliable) return null;
  const radius = context ? 2 : 0;
  const left = focus.first - radius;
  const right = focus.first + focus.labels.length + radius; // exclusive
  let from = index;
  let to = index;
  while (from > 0 && units[from].first > left) from--;
  while (to + 1 < units.length && units[to + 1].first < right) to++;
  // An outer cut needs a usable boundary. Interior closures and pauses stay
  // intact. A sustained vowel is included as a whole even at a context edge.
  const trimmed = !units[from].reliable || !units[to].reliable;
  while (from < index && !units[from].reliable) from++;
  while (to > index && !units[to].reliable) to--;
  const first = units[from],
    last = units[to];
  return {
    from,
    to,
    trimmed,
    reference: [first.referenceStart, last.referenceEnd],
    take: [first.start, last.end],
  };
}

function cut(pcm, [start, end]) {
  if (!Number.isFinite(start) || !Number.isFinite(end))
    throw new Error("Invalid excerpt boundary");
  const frame = (ms) =>
    Math.max(0, Math.min(pcm.length, Math.round((ms * sampleRate) / 1000)));
  const slice = pcm.subarray(frame(start), frame(end));
  if (!slice.length) throw new Error("Empty excerpt");
  return slice;
}

// A single local WAV gives the native player one seekable, pitch-preserving
// A/B loop. The silence between speakers and before repeating is intentional.
export function excerptWave(samples, range) {
  const reference = cut(samples.reference, range.reference);
  const take = cut(samples.take, range.take);
  const gap = Math.round(0.3 * sampleRate);
  const takeOffset = reference.length + gap;
  const frames = takeOffset + take.length + gap;
  const bytes = new ArrayBuffer(44 + frames * 2);
  const view = new DataView(bytes);
  function fourCC(offset, text) {
    for (let i = 0; i < 4; i++) view.setUint8(offset + i, text.charCodeAt(i));
  }
  fourCC(0, "RIFF");
  view.setUint32(4, bytes.byteLength - 8, true);
  fourCC(8, "WAVE");
  fourCC(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  fourCC(36, "data");
  view.setUint32(40, frames * 2, true);
  function write(pcm, offset) {
    const fade = Math.round(0.003 * sampleRate);
    for (let i = 0; i < pcm.length; i++) {
      const ramp = Math.min(1, i / fade, (pcm.length - 1 - i) / fade);
      const value = Math.max(-1, Math.min(1, pcm[i] * ramp));
      view.setInt16(
        44 + 2 * (offset + i),
        Math.round(value * (value < 0 ? 32768 : 32767)),
        true,
      );
    }
  }
  write(reference, 0);
  write(take, takeOffset);
  return {
    blob: new Blob([bytes], { type: "audio/wav" }),
    referenceEnd: reference.length / sampleRate,
    takeStart: takeOffset / sampleRate,
    takeEnd: (takeOffset + take.length) / sampleRate,
  };
}
