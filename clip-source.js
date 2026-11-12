import { clips, replyClips } from "./assets/audio/catalog.js?v=3";

import { contrastClips } from "./assets/audio/contrasts.js";

function lookup(text, learner = false) {
  // Spaces between phrases and ruby readings can differ across learning views.
  const key = text.normalize("NFKC").replace(/\s/gu, "");
  if (learner && Object.hasOwn(replyClips, key)) return replyClips[key];
  return Object.hasOwn(clips, key)
    ? clips[key]
    : Object.hasOwn(contrastClips, key)
      ? contrastClips[key]
      : null;
}

export function clipStem(text, reading = "", learner = false) {
  return (
    lookup(String(text || "").trim(), learner) || (reading && lookup(reading))
  );
}
