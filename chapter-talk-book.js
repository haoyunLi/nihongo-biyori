// Each record gets its own storage key so different chapters and different
// missed turns can be saved independently across tabs.
import { chapterTalks, chapterTurns } from "./chapter-talk-data.js";
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
    return entries
      .filter(
        (e) =>
          Number.isInteger(e.record?.due) &&
          e.record.due <= day &&
          e.record.reviewed !== day,
      )
      .sort((a, b) => a.record.due - b.record.due || a.key.localeCompare(b.key))
      .slice(0, Math.max(0, 3 - already))
      .map((e) => ({ id: e.key, variant: e.record.variant || 0 }));
  }
  function settle(id, flags, review, variant = 0) {
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
        due: missed ? day + 1 : null,
        reviewed: day,
        variant: 1 - variant,
      });
    } else if (missed) {
      write(key, {
        ...old,
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
  return { checkpoint, patch, due, settle, remaining, markTurn };
}
