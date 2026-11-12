export function moraLabels(reading) {
  const out = [];
  for (const c of Array.from((reading || "").normalize("NFKC"))) {
    if (!/[ぁ-ゖァ-ヺー]/u.test(c)) continue;
    if (out.length && /[ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ]/u.test(c))
      out[out.length - 1] += c;
    else out.push(c);
  }
  return out;
}
export function makeGroups(plan, reading = "") {
  const typed = moraLabels(reading),
    canLabel = typed.length === plan.filter(([, ph]) => ph !== "sp").length;
  const groups = [];
  let count = 0,
    lastVowel = "";
  for (const [mora, ph] of plan) {
    if (ph === "sp") {
      groups.push({ pause: true, phones: ["sp"] });
      lastVowel = "";
      continue;
    }
    const text = canLabel
      ? typed[count]
      : mora.replace(/[ァ-ヶ]/gu, (c) =>
          String.fromCodePoint(c.codePointAt(0) - 96),
        );
    const previous = groups.at(-1),
      phones = ph.split(" ");
    if (
      previous &&
      !previous.pause &&
      phones.length === 1 &&
      ph === lastVowel &&
      /^[aiueo]$/.test(ph)
    ) {
      // No acoustic landmark separates a sustained vowel from its continuation.
      previous.labels.push(text);
      previous.phones[previous.phones.length - 1] = ph + ":";
    } else groups.push({ first: count, labels: [text], phones });
    lastVowel = phones.at(-1);
    count++;
  }
  return groups;
}
