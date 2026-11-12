// 16 kHz, 25 ms Hamming windows, 10 ms hops. JNAS uses MFCC_E_D_N_Z:
// twelve liftered, mean-centred cepstra, their deltas and the log-energy delta.
export const RATE = 16000,
  HOP = 160,
  FRAME = 400;
const N = 512,
  BANDS = 24,
  D = 12;
const hamming = Float64Array.from(
  { length: FRAME },
  (_, i) => 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (FRAME - 1)),
);
const angles = Float64Array.from(
  { length: N },
  (_, i) => (2 * Math.PI * i) / N,
);
const cs = angles.map(Math.cos),
  sn = angles.map(Math.sin);
const reverse = Uint16Array.from({ length: N }, (_, i) =>
  parseInt(i.toString(2).padStart(9, "0").split("").reverse().join(""), 2),
);
const dct = Array.from({ length: D }, (_, i) =>
  Float64Array.from(
    { length: BANDS },
    (_, k) =>
      Math.sqrt(2 / BANDS) *
      Math.cos((Math.PI * (i + 1) * (k + 0.5)) / BANDS) *
      (1 + 11 * Math.sin(((i + 1) * Math.PI) / 22)),
  ),
);
const mel = (x) => Math.log1p(x / 700);
const filters = Array.from({ length: N / 2 }, (_, k) => {
  const f = (mel((k * RATE) / N) / mel(RATE / 2)) * (BANDS + 1);
  return [Math.floor(f) - 1, f - Math.floor(f)];
});
export function quantile(values, q) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b),
    x = (s.length - 1) * q,
    lower = Math.floor(x);
  return s[lower] + (s[Math.ceil(x)] - s[lower]) * (x - lower);
}
function fft(re, im) {
  for (let len = 2; len <= N; len *= 2) {
    const half = len >> 1,
      step = N / len;
    for (let base = 0; base < N; base += len)
      for (let j = 0; j < half; j++) {
        const a = base + j,
          b = a + half,
          k = j * step;
        const r = re[b] * cs[k] + im[b] * sn[k],
          t = im[b] * cs[k] - re[b] * sn[k];
        re[b] = re[a] - r;
        im[b] = im[a] - t;
        re[a] += r;
        im[a] += t;
      }
  }
}

// Inputs are anti-aliased/resampled at decode time. Trim only external quiet;
// a low-energy closure inside a word must stay on the timeline.
export function features(pcm) {
  if (pcm.length > RATE * 18 || pcm.length < 800) return { error: "length" };
  const env = [];
  let clipped = 0;
  for (let i = 0; i < pcm.length; i += HOP) {
    let e = 0;
    const end = Math.min(i + HOP, pcm.length);
    for (let k = i; k < end; k++) {
      const v = pcm[k];
      if (!Number.isFinite(v)) return { error: "quiet" };
      e += v * v;
      if (Math.abs(v) > 0.985) clipped++;
    }
    env.push(Math.sqrt(e / (end - i)));
  }
  const peak = quantile(env, 0.99),
    floor = quantile(env, 0.12);
  if (peak < 0.002 || Math.max(...env) < 0.0033) return { error: "quiet" };
  const gate = Math.max(
    0.00065,
    Math.min(peak * 0.14, Math.max(peak * 0.025, floor * 2.3)),
  );
  const a = env.findIndex((v) => v > gate);
  let b = env.length - 1;
  while (b >= 0 && env[b] <= gate) b--;
  if (a < 0 || b - a < 5) return { error: "length" };
  if (clipped / ((b - a + 1) * HOP) > 0.025) return { error: "clipped" };
  const offset = (a - 9) * HOP;
  const n = b - a + 17;
  const gain = 9500 / Math.max(peak, 0.015);
  const cep = [],
    energy = [],
    shape = [],
    rms = [];
  const re = new Float64Array(N),
    im = new Float64Array(N),
    bank = new Float64Array(BANDS);
  let active = 0,
    narrow = 0,
    noisy = 0;
  for (let t = 0; t < n; t++) {
    re.fill(0);
    im.fill(0);
    bank.fill(0);
    const base = offset + t * HOP;
    let e = 0,
      raw = 0,
      prior = 0;
    for (let j = 0; j < FRAME; j++) {
      const x = (pcm[base + j] || 0) * gain;
      const y = (j ? x - 0.97 * prior : x * 0.03) * hamming[j];
      re[reverse[j]] = y;
      prior = x;
      e += y * y;
      raw += x * x;
    }
    fft(re, im);
    let geom = 0,
      sum = 0,
      top = 0,
      last1 = 0,
      last2 = 0,
      last3 = 0,
      last4 = 0;
    for (let k = 1; k < N / 2; k++) {
      const mag = Math.hypot(re[k], im[k]),
        [band, frac] = filters[k];
      if (band >= 0 && band < BANDS) bank[band] += mag * (1 - frac);
      if (band + 1 >= 0 && band + 1 < BANDS) bank[band + 1] += mag * frac;
      const p = mag * mag + 1e-14;
      sum += p;
      geom += Math.log(p);
      top = Math.max(top, p + last1 + last2 + last3 + last4);
      last4 = last3;
      last3 = last2;
      last2 = last1;
      last1 = p;
    }
    const level = Math.sqrt(raw / FRAME) / gain;
    if (level > Math.max(peak * 0.12, 0.001)) {
      active++;
      if (top / sum > 0.982) narrow++;
      if (Math.exp(geom / 255) / (sum / 255) > 0.3) noisy++;
    }
    for (let k = 0; k < BANDS; k++) bank[k] = Math.log(Math.max(1, bank[k]));
    const c = new Float32Array(D + 1);
    for (let j = 0; j < D; j++) {
      for (let k = 0; k < BANDS; k++) c[j] += bank[k] * dct[j][k];
    }
    c[D] = Math.log(Math.max(1, e));
    cep.push(c);
    energy.push(c[D]);
    rms.push(level);
    // Smooth adjacent channels for a second, channel-normalised alignment.
    const spectral = new Float32Array(12);
    for (let j = 0; j < 12; j++)
      spectral[j] = (bank[2 * j] + bank[2 * j + 1]) / 2;
    shape.push(spectral);
  }
  if (active < 5) return { error: "quiet" };
  if (narrow / active > 0.78 || noisy / active > 0.7) return { error: "noise" };
  const mean = new Float64Array(D),
    bandMean = new Float64Array(12);
  let central = 0;
  for (let i = 0; i < n; i++) {
    if (i < 7 || i >= n - 6) continue;
    central++;
    for (let j = 0; j < D; j++) mean[j] += cep[i][j];
    for (let j = 0; j < 12; j++) bandMean[j] += shape[i][j];
  }
  const emax = quantile(energy, 0.97);
  const vectors = cep.map((c, i) => {
    const f = new Float32Array(25);
    for (let j = 0; j < D; j++) f[j] = c[j] - mean[j] / central;
    for (let j = 0; j <= D; j++)
      for (let w = 1; w <= 2; w++) {
        const hi = cep[Math.min(n - 1, i + w)][j],
          lo = cep[Math.max(0, i - w)][j];
        f[12 + j] +=
          (w *
            (j === D
              ? Math.max(hi, emax - 12) - Math.max(lo, emax - 12)
              : hi - lo)) /
          10;
      }
    for (let j = 0; j < 12; j++) shape[i][j] -= bandMean[j] / central;
    return f;
  });
  return { vectors, shape, rms, peak, offsetMs: offset / 16 + 12.5 };
}
