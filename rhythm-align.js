import { features, quantile } from "./rhythm-features.js";

export { makeGroups, moraLabels } from "./mora-groups.js";

// Log likelihood of the most likely component in each 16-mixture GMM state.
function scoreFrames(f, model, states) {
  const { weights } = model,
    byFrame = [],
    best = [];
  for (const vector of f.vectors) {
    const scores = new Float32Array(states.length);
    let top = -Infinity;
    for (let k = 0; k < states.length; k++) {
      let hi = -Infinity,
        offset = states[k] * 16 * 51;
      for (let j = 0; j < 16; j++, offset += 51) {
        let v = weights[offset];
        for (let d = 0; d < 25; d++) {
          const dif = vector[d] - weights[offset + 1 + d];
          v -= dif * dif * weights[offset + 26 + d];
        }
        if (v > hi) hi = v;
      }
      scores[k] = hi;
      top = Math.max(top, hi);
    }
    best.push(top);
    byFrame.push(scores);
  }
  return { byFrame, best };
}
export function forceAlign(f, groups, model) {
  const padded = [{ phones: ["silB"] }, ...groups, { phones: ["silE"] }];
  const chain = [];
  for (let group = 0; group < padded.length; group++) {
    for (const phone of padded[group].phones) {
      const phoneId = model.names.indexOf(phone);
      if (phoneId < 0) return null;
      for (let k = 0; k < 3; k++)
        chain.push({ group: group - 1, state: phoneId * 3 + k });
    }
  }
  // Alternative vowel/nasal/fricative states provide competing scores even
  // when a short prompt contains only one or two expected phones.
  const states = new Set(chain.map((s) => s.state));
  for (const name of [
    "a",
    "i",
    "u",
    "e",
    "o",
    "N",
    "s",
    "sh",
    "k",
    "t",
    "r",
    "q",
  ]) {
    const i = model.names.indexOf(name) * 3;
    states.add(i);
    states.add(i + 1);
    states.add(i + 2);
  }
  const list = [...states],
    { byFrame, best } = scoreFrames(f, model, list);
  const count = chain.length,
    frames = f.vectors.length,
    back = new Uint8Array(count * frames);
  const index = chain.map((s) => list.indexOf(s.state)),
    tr = chain.map((s) => model.transitions[s.state]);
  let before = new Float64Array(count),
    after = new Float64Array(count);
  before.fill(-Infinity);
  before[0] = byFrame[0][index[0]];
  for (let t = 1; t < frames; t++) {
    for (let j = 0; j < count; j++) {
      let val = before[j] + tr[j][0],
        from = 0;
      if (j > 0 && before[j - 1] + tr[j - 1][1] > val) {
        val = before[j - 1] + tr[j - 1][1];
        from = 1;
      }
      if (
        j >= 4 &&
        chain[j - 1].group !== chain[j].group &&
        groups[chain[j - 1].group]?.pause
      ) {
        const skip = before[j - 4] + tr[j - 4][1] - 1;
        if (skip > val) {
          val = skip;
          from = 4;
        }
      }
      const group = chain[j].group;
      // The trimmed recording has nine context frames on each edge. A
      // silence model may explain a quiet vowel, but cannot swallow a word.
      const outside =
        (group < 0 && t > 9) ||
        (group === groups.length && t < frames - 10) ||
        (group >= 0 && group < groups.length && (t < 4 || t > frames - 4));
      after[j] = outside ? -Infinity : val + byFrame[t][index[j]];
      back[t * count + j] = from;
    }
    [before, after] = [after, before];
  }
  if (!Number.isFinite(before[count - 1])) return null;
  const spans = groups.map(() => ({ start: frames, end: 0, gap: 0, fit: 0 }));
  let totalGap = 0,
    totalFit = 0,
    n = 0,
    j = count - 1;
  for (let t = frames - 1; t >= 0; t--) {
    const g = chain[j].group;
    if (g >= 0 && g < groups.length) {
      const span = spans[g],
        score = byFrame[t][index[j]];
      span.start = t;
      span.end = Math.max(span.end, t + 1);
      if (!groups[g].pause) {
        span.gap += best[t] - score;
        span.fit += score;
        totalGap += best[t] - score;
        totalFit += score;
        n++;
      }
    }
    j -= back[t * count + j];
  }
  const units = spans.flatMap((span, i) => {
    if (groups[i].pause) return [];
    const duration = span.end - span.start;
    return [
      {
        ...groups[i],
        ...span,
        duration,
        gap: span.gap / duration,
        fit: span.fit / duration,
      },
    ];
  });
  if (!units.length) return null;
  return {
    units,
    start: units[0].start,
    end: units.at(-1).end,
    gap: totalGap / n,
    fit: totalFit / n,
    features: f,
  };
}
export function measure(pcm, groups, model) {
  const f = features(pcm);
  if (f.error) return f;
  const alignment = forceAlign(f, groups, model);
  return alignment || { error: "alignment" };
}

// Independently align spectral trajectories to cross-check the phone model's
// proposed boundaries. Path distances compare shape and relative energy.
function templateMap(ref, take) {
  const n = ref.end - ref.start,
    m = take.end - take.start,
    width = m + 1;
  const trace = new Uint8Array((n + 1) * width),
    f = ref.features,
    h = take.features;
  let prev = new Float64Array(width),
    curr = new Float64Array(width);
  prev.fill(Infinity);
  prev[0] = 0;
  let finalCost;
  for (let i = 1; i <= n; i++) {
    curr.fill(Infinity);
    const a = ref.start + i - 1;
    const lo = Math.max(1, Math.floor((i / n - 0.32) * m) - 3),
      hi = Math.min(m, Math.ceil((i / n + 0.32) * m) + 3);
    for (let j = lo; j <= hi; j++) {
      const b = take.start + j - 1;
      let cost = 0;
      for (let k = 0; k < 12; k++) {
        const d = f.shape[a][k] - h.shape[b][k];
        cost += Math.min(16, d * d);
      }
      const ed =
        Math.log(Math.max(0.015, f.rms[a] / f.peak)) -
        Math.log(Math.max(0.015, h.rms[b] / h.peak));
      cost = cost / 12 + 0.2 * Math.min(16, ed * ed);
      let v = prev[j - 1],
        step = 0;
      if (prev[j] + 0.24 < v) {
        v = prev[j] + 0.24;
        step = 1;
      }
      if (curr[j - 1] + 0.24 < v) {
        v = curr[j - 1] + 0.24;
        step = 2;
      }
      curr[j] = cost + v;
      trace[i * width + j] = step;
    }
    [prev, curr] = [curr, prev];
  }
  finalCost = prev[m];
  const sum = new Float64Array(n),
    cnt = new Uint16Array(n);
  let i = n,
    j = m,
    length = 0;
  while (i > 0 && j > 0) {
    sum[i - 1] += take.start + j - 1;
    cnt[i - 1]++;
    length++;
    const step = trace[i * width + j];
    if (step !== 2) i--;
    if (step !== 1) j--;
  }
  const boundary = (t) =>
    t <= ref.start
      ? take.start
      : t >= ref.end
        ? take.end
        : (sum[t - ref.start] / cnt[t - ref.start] +
            sum[t - ref.start - 1] / cnt[t - ref.start - 1] +
            1) /
          2;
  return { boundary, cost: finalCost / length };
}

export function compareAlignment(ref, take, slow = false) {
  if (ref.error) return { status: "uncertain", reason: "reference" };
  if (take.error) return { status: "uncertain", reason: take.error };
  const speed = (take.end - take.start) / (ref.end - ref.start);
  if (speed < 0.4 || speed > 2.6)
    return { status: "uncertain", reason: "length" };
  const map = templateMap(ref, take);
  const stats = {
    cost: map.cost,
    fit: take.fit,
    gap: take.gap,
    refGap: ref.gap,
    refFit: ref.fit,
    speed,
  };
  if (
    map.cost > 2.25 ||
    (map.cost > 1.45 && take.gap > 2.5) ||
    take.gap > Math.max(4, ref.gap + 2.6) ||
    take.fit < ref.fit - 14
  )
    return { status: "uncertain", reason: "alignment", stats };
  const units = ref.units.map((r, i) => {
    const u = take.units[i],
      dtw = map.boundary(r.end) - map.boundary(r.start);
    const disagreement = Math.max(
      Math.abs(map.boundary(r.start) - u.start),
      Math.abs(map.boundary(r.end) - u.end),
    );
    const reliable =
      disagreement <= Math.max(4.5, Math.min(9, 0.27 * u.duration)) &&
      u.gap < Math.max(16, r.gap + 9) &&
      r.duration >= 4;
    return {
      first: r.first,
      labels: r.labels,
      phones: r.phones,
      refMs: r.duration * 10,
      userMs: reliable ? (u.duration * 0.6 + dtw * 0.4) * 10 : u.duration * 10,
      altMs: dtw * 10,
      reliable,
      gap: u.gap,
      disagreement,
      referenceStart: Math.max(0, ref.features.offsetMs + r.start * 10),
      referenceEnd: Math.max(0, ref.features.offsetMs + r.end * 10),
      start: Math.max(0, take.features.offsetMs + u.start * 10),
      end: Math.max(0, take.features.offsetMs + u.end * 10),
    };
  });
  const ratios = units.filter((u) => u.reliable).map((u) => u.userMs / u.refMs);
  if (ratios.length < Math.ceil(units.length * 0.65))
    return { status: "uncertain", reason: "alignment", stats };
  let tempo = quantile(ratios, 0.5);
  if (units.length === 1) tempo = slow ? 1 / 0.84 : 1;
  if (units.length === 2 && ratios.length === 2) {
    // With only two groups, the target recording supplies a weak rate anchor.
    // A similarly paced pair is always treated as a whole-utterance change.
    const nominal = slow ? 1 / 0.84 : 1;
    if (
      Math.abs(Math.log(ratios[0] / ratios[1])) > (map.cost < 0.4 ? 0.18 : 0.24)
    ) {
      const anchors = ratios.filter(
        (rate) => Math.abs(Math.log(rate / nominal)) < 0.15,
      );
      if (anchors.length === 1) tempo = anchors[0];
      else if (
        anchors.length === 0 &&
        Math.abs(Math.log(ratios[0] / ratios[1])) > 0.52
      )
        return { status: "uncertain", reason: "tempo", stats };
    }
  }
  const suspects = [];
  for (const [i, u] of units.entries()) {
    u.expectedMs = u.refMs * tempo;
    u.ratio = u.userMs / u.expectedMs;
    const alt = u.altMs / u.expectedMs;
    const difference = u.userMs - u.expectedMs;
    const closeMatch = map.cost < 0.6;
    const longVowel = u.labels.length > 1;
    const minChange =
      closeMatch && (longVowel || u.phones.includes("q"))
        ? 28
        : closeMatch
          ? 40
          : 58;
    const long = closeMatch ? (longVowel ? 1.28 : 1.42) : 1.62;
    const short = closeMatch
      ? longVowel && map.cost < 0.4
        ? 0.82
        : longVowel || u.phones.includes("q")
          ? 0.77
          : 0.7
      : 0.62;
    if (!u.reliable || Math.abs(difference) < Math.max(minChange, 25 * tempo))
      continue;
    if (
      (u.ratio > long && alt > long - 0.12) ||
      (u.ratio < short && alt < short + 0.08)
    )
      suspects.push(i);
  }
  suspects.sort(
    (a, b) =>
      Math.abs(Math.log(units[b].ratio)) - Math.abs(Math.log(units[a].ratio)),
  );
  return {
    status: "measured",
    units,
    target: suspects[0] ?? null,
    tempo,
    single: units.length === 1,
    stats,
  };
}

// Both recordings are excerpts here. Recompute the template on this window
// so spectral normalization, expected phones and speaking rate use its scope.
export function comparePart(reference, take, groups, selection, model) {
  const first = groups.findIndex((g) => g.first === selection.first);
  const last = groups.findIndex((g) => g.first === selection.last);
  if (first < 0 || last < first)
    return { status: "uncertain", reason: "alignment" };
  const local = groups.slice(first, last + 1); // Includes pauses between groups.
  if (local.length === 1 && local[0].phones.includes("q"))
    return { status: "uncertain", reason: "closure" };
  return compareAlignment(
    measure(reference, local, model),
    measure(take, local, model),
  );
}
