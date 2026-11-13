// Durations follow captured samples, independent of main-thread frame timing.
export function endpoint(rate) {
  let elapsed = 0,
    onset = 0,
    voiced = 0,
    quiet = 0,
    started = false,
    noise = 0.001;
  return (samples) => {
    let power = 0;
    for (const v of samples) power += v * v;
    const rms = Math.sqrt(power / samples.length),
      dt = samples.length / rate;
    elapsed += dt;
    const loud = rms > Math.max(0.003, noise * (started ? 2 : 3));
    if (!started) {
      if (loud) onset += dt;
      else {
        onset = 0;
        noise += (Math.min(rms, 0.018) - noise) * 0.08;
      }
      if (onset >= 0.085) {
        started = true;
        voiced = onset;
      }
      if (!started) return elapsed >= 12 ? "empty" : "waiting";
    } else if (loud) {
      voiced += dt;
      quiet = 0;
    } else quiet += dt;
    if (quiet >= 1.45) return voiced >= 0.105 ? "end" : "empty";
    return elapsed >= 28 ? "limit" : "speech";
  };
}
// Missing confidence, an unfinished ending, or disagreement with the current
// question should stay on screen. Never treat uncertain ASR as a missed turn.
export function canAutoReply(result, decision, reason) {
  if (reason !== "end" || !["ok", "repeat"].includes(decision.kind))
    return false;
  const words = result.words;
  if (!words?.length || words.some((w) => !Number.isFinite(w.conf)))
    return false;
  // Only ignore an exact polite ending after substantive words. In a short
  // yes/no answer, the same words can carry the entire meaning.
  const ending = result.text.match(
    /(?:で|を)?(?:お願いします|おねがいします|ください)$/u,
  );
  let content = words;
  if (ending && ending.index > 0) {
    let length = 0;
    const meaningful = words.filter((w) => {
      const start = length;
      length += (w.word || "").length;
      return start < ending.index;
    });
    if (length === result.text.length && meaningful.length)
      content = meaningful;
  }
  const confidence =
    content.reduce((sum, w) => sum + w.conf, 0) / content.length;
  return (
    confidence >= 0.83 &&
    content.every((w) => w.conf >= 0.56) &&
    !/(?:を|えーと|えっと|そのー|あのー|じゃなくて|ではなくて)$/u.test(
      result.text,
    )
  );
}
