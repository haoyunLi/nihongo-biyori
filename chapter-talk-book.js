// Each record gets its own storage key so different chapters and different
// missed turns can be saved independently across tabs.
import { chapterTalks, chapterTurns } from "./chapter-talk-data.js";
import { tripByChapter } from "./weekly-trips.js";
const prefix = "nihongo-biyori-chapter-talk-v1:";
export function createChapterBook(storage, readDay) {
  const memory = new Map();
  let writable = true;
  function read(key) {
    try {
      return writable
        ? JSON.parse(storage.getItem(prefix + key) || "null")
        : memory.get(key);
    } catch {
      return memory.get(key);
    }
  }
  function write(key, value) {
    memory.set(key, value);
    try {
      storage.setItem(prefix + key, JSON.stringify(value));
    } catch {
      writable = false;
    }
  }
  function checkpoint(id) {
    return read("lesson:" + id) || {};
  }
  function patch(id, data) {
    write("lesson:" + id, { ...checkpoint(id), ...data });
  }
  function due(day = readDay()) {
    const entries = [...chapterTurns.keys()].map((key) => ({
      key,
      record: read("retry:" + key),
    }));
    const already = entries.filter((e) => e.record?.reviewed === day).length;
    const ready = entries.filter(
      (e) =>
        Number.isInteger(e.record?.due) &&
        e.record.due <= day &&
        e.record.reviewed !== day,
    );
    // On the day after a trip, keep its missed phrases together. The larger
    // window buys time for those phrases only; it doesn't pull in extra cards.
    const tripReviews = entries.filter(
      (e) =>
        e.record?.trip &&
        (e.record.reviewed === day ||
          (Number.isInteger(e.record.due) && e.record.due <= day)),
    ).length;
    const limit = Math.min(5, Math.max(3, tripReviews));
    return ready
      .sort(
        (a, b) =>
          Number(Boolean(b.record.trip)) - Number(Boolean(a.record.trip)) ||
          a.record.due - b.record.due ||
          a.key.localeCompare(b.key),
      )
      .slice(0, Math.max(0, limit - already))
      .map((e) => ({
        id: e.key,
        variant: e.record.variant || 0,
        ...(e.record.trip ? { trip: e.record.trip } : {}),
      }));
  }
  function reviewMinutes(day = readDay()) {
    const done = [...chapterTurns.keys()].filter(
      (k) => read("retry:" + k)?.reviewed === day,
    ).length;
    return done + due(day).length > 3 ? 3 : 2;
  }
  function settle(id, flags, review, variant = 0, trip) {
    const day = readDay(),
      missed = flags.length > 0,
      key = "retry:" + id,
      old = read(key) || {};
    if (review) {
      // An older tab may still hold yesterday's question after another tab
      // has finished it. Do not repeat or postpone that same review again.
      if (!Number.isInteger(old.due) || old.due > day || old.reviewed === day)
        return;
      write(key, {
        ...old,
        due: missed ? day + 1 : null,
        reviewed: day,
        variant: 1 - variant,
      });
    } else if (missed) {
      write(key, {
        ...old,
        trip: trip || (Number.isInteger(old.due) ? old.trip : undefined),
        due: Number.isInteger(old.due) ? Math.min(old.due, day + 1) : day + 1,
        variant: old.due == null ? 1 : old.variant,
      });
    }
  }
  function remaining(id) {
    const passed = checkpoint(id).passed || [];
    return chapterTalks
      .get(id)
      .turns.filter((t) => !passed.includes(t.key))
      .map((t) => ({ id: t.key, variant: 0 }));
  }
  function markTurn(id, flags) {
    const t = chapterTurns.get(id),
      data = checkpoint(t.lesson);
    settle(id, flags, false);
    const passed = [...new Set([...(data.passed || []), id])];
    patch(t.lesson, {
      passed,
      talk: passed.length === chapterTalks.get(t.lesson).turns.length,
    });
  }
  // Trips reuse the same phrase/retry key as the source lesson, but completing
  // a trip must never mark the source chapter's own conversation as finished.
  function tripState(id) {
    const trip = tripByChapter.get(id),
      data = checkpoint("week:" + id);
    const records = [],
      items = [];
    for (const t of trip.turns) {
      const flags = data.answers?.[t.id];
      if (Array.isArray(flags)) records.push({ id: t.id, flags });
      else items.push({ ...t, variant: 0 });
    }
    return {
      records,
      items,
      complete: !items.length,
    };
  }
  function tripHelp(id, key, flag) {
    const slot = "week:" + id,
      data = checkpoint(slot);
    settle(key, [flag], false, 0, id);
    if (data.answers?.[key]) return;
    patch(slot, {
      pending: {
        ...data.pending,
        [key]: [...new Set([...(data.pending?.[key] || []), flag])],
      },
    });
  }
  function tripAnswer(id, key, flags) {
    const slot = "week:" + id,
      data = checkpoint(slot);
    const used = [...new Set([...(data.pending?.[key] || []), ...flags])];
    // Assistance was queued at the moment it was used, even if the learner
    // finished this turn on a later date after independently clearing its retry.
    if (flags.some((f) => !data.pending?.[key]?.includes(f)))
      settle(key, flags, false, 0, id);
    patch(slot, { answers: { ...data.answers, [key]: used } });
  }
  function restartTrip(id) {
    patch("week:" + id, { answers: {}, pending: {} });
  }
  return {
    checkpoint,
    patch,
    due,
    reviewMinutes,
    settle,
    remaining,
    markTurn,
    tripState,
    tripHelp,
    tripAnswer,
    restartTrip,
  };
}
