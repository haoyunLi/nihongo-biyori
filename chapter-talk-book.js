// Each record gets its own storage key so different chapters and different
// missed turns can be saved independently across tabs.
import { chapterTalks, chapterTurns } from "./chapter-talk-data.js?v=20";
import { tripByChapter } from "./weekly-trips.js?v=19";
import { validProposal } from "./trip-questions.js";
import {
  encounterEntries,
  tripAttempt,
  assignedEntry,
} from "./trip-encounters.js?v=20";
const retryKeys = [...chapterTurns.keys(), ...encounterEntries.keys()];
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
    const entries = retryKeys.map((key) => ({
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
    const limit = Math.min(7, Math.max(3, tripReviews));
    return ready
      .sort(
        (a, b) =>
          Number(Boolean(b.record.trip)) - Number(Boolean(a.record.trip)) ||
          a.record.due - b.record.due ||
          Number(!!assignedEntry(b.key)?.change) -
            Number(!!assignedEntry(a.key)?.change) ||
          a.key.localeCompare(b.key),
      )
      .slice(0, Math.max(0, limit - already))
      .map((e) => ({
        id: e.key,
        variant: e.record.variant || 0,
        ...(assignedEntry(e.key)?.choices && Number.isInteger(e.record.choice)
          ? { choice: e.record.choice }
          : {}),
        ...(validProposal(e.record.meeting)
          ? { meeting: e.record.meeting }
          : {}),
        ...(e.record.trip ? { trip: e.record.trip } : {}),
        ...(validProposal(e.record.proposal)
          ? { proposal: e.record.proposal }
          : {}),
      }));
  }
  function reviewMinutes(day = readDay()) {
    const done = retryKeys.filter(
      (k) => read("retry:" + k)?.reviewed === day,
    ).length;
    return done + due(day).length > 3 ? 3 : 2;
  }
  function settle(
    id,
    flags,
    review,
    variant = 0,
    trip,
    choice,
    proposal,
    meeting,
  ) {
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
        choice: choice ?? old.choice,
        proposal: proposal ?? old.proposal,
      });
    } else if (missed) {
      write(key, {
        ...old,
        meeting:
          meeting ?? (Number.isInteger(old.due) ? old.meeting : undefined),
        trip: trip || (Number.isInteger(old.due) ? old.trip : undefined),
        choice: choice ?? (Number.isInteger(old.due) ? old.choice : undefined),
        proposal:
          proposal ?? (Number.isInteger(old.due) ? old.proposal : undefined),
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
    const data = checkpoint("week:" + id);
    // Old visits keep their original questions and completion until replayed.
    const old =
      Object.hasOwn(data, "answers") || Object.hasOwn(data, "pending");
    const edition = data.edition ?? (old ? null : 0);
    const trip = tripAttempt(
      tripByChapter.get(id),
      edition,
      data.choices,
      data.proposals,
      data.answers,
      data.skipped,
      data.allowChanges ?? !old,
    );
    const records = [],
      items = [];
    for (const t of trip.turns) {
      const flags = data.answers?.[t.id];
      if (Array.isArray(flags))
        records.push({
          id: t.id,
          flags,
          ...(validProposal(data.proposals?.[t.id])
            ? { proposal: data.proposals[t.id] }
            : {}),
          ...(Number.isInteger(data.choices?.[t.id])
            ? { choice: data.choices[t.id], skipped: !!data.skipped?.[t.id] }
            : {}),
        });
      else
        items.push({
          ...t,
          ...(trip.allowChanges ? { allowChanges: true } : {}),
          variant: 0,
          initiating: data.initiating === t.id,
        });
    }
    return {
      records,
      items,
      trip,
      edition,
      complete: !items.length,
    };
  }
  function tripHelp(id, key, flag) {
    const slot = "week:" + id,
      data = checkpoint(slot);
    if (data.answers?.[key]) return;
    const { edition, items, trip } = tripState(id);
    const entry = assignedEntry(key);
    settle(
      key,
      [flag],
      false,
      0,
      id,
      entry.change
        ? entry.choices.findIndex((_, i) => i !== entry.keepChoice)
        : data.initiating === key
          ? entry.initiative
          : undefined,
      undefined,
      items.find((t) => t.id === key)?.meeting,
    );
    patch(slot, {
      allowChanges: !!trip.allowChanges,
      edition,
      pending: {
        ...data.pending,
        [key]: [...new Set([...(data.pending?.[key] || []), flag])],
      },
    });
  }
  function tripAnswer(
    id,
    key,
    flags,
    choice,
    skipped = false,
    proposal,
    repair,
  ) {
    const slot = "week:" + id,
      data = checkpoint(slot);
    if (!encounterEntries.get(key)?.choices) choice = undefined;
    const { edition, items, trip } = tripState(id);
    if (items[0]?.id !== key) return;
    const used = [...new Set([...(data.pending?.[key] || []), ...flags])];
    // Assistance was queued at the moment it was used, even if the learner
    // finished this turn on a later date after independently clearing its retry.
    if (flags.some((f) => !data.pending?.[key]?.includes(f)))
      settle(key, flags, false, 0, id, choice, proposal, items[0]?.meeting);
    if ((Number.isInteger(choice) || validProposal(proposal)) && used.length) {
      const retry = read("retry:" + key);
      if (Number.isInteger(retry?.due))
        write("retry:" + key, {
          ...retry,
          choice:
            skipped && assignedEntry(key).change
              ? (retry.choice ??
                assignedEntry(key).choices.findIndex(
                  (_, i) => i !== assignedEntry(key).keepChoice,
                ))
              : choice,
          proposal: validProposal(proposal) ? proposal : undefined,
        });
    }
    const update = {
      allowChanges: !!trip.allowChanges,
      edition,
      answers: { ...data.answers, [key]: used },
      ...(validProposal(proposal)
        ? { proposals: { ...data.proposals, [key]: proposal } }
        : {}),
      ...(Number.isInteger(choice)
        ? {
            choices: { ...data.choices, [key]: choice },
            skipped: { ...data.skipped, [key]: skipped },
          }
        : {}),
    };
    if (!skipped && repair && trip.allowChanges) {
      // Resolve and save both choices in one localStorage write. An incomplete
      // or stale repair cannot skip a different question.
      const projected = tripAttempt(
        tripByChapter.get(id),
        edition,
        update.choices ?? data.choices,
        update.proposals ?? data.proposals,
        update.answers,
        update.skipped ?? data.skipped,
        true,
      );
      const following =
        projected.turns[projected.turns.findIndex((t) => t.id === key) + 1];
      if (
        following?.id === repair.id &&
        assignedEntry(repair.id)?.change &&
        assignedEntry(repair.id).choices[repair.choice]
      ) {
        update.answers[repair.id] = used;
        if (used.length) {
          // Assistance belonged to the corrected utterance. Schedule its
          // final meaning once; keep an older, independently due question.
          const oldRetry = read("retry:" + key);
          if (oldRetry?.due === readDay() + 1)
            write("retry:" + key, { ...oldRetry, due: null });
          settle(
            repair.id,
            used,
            false,
            0,
            id,
            repair.choice,
            undefined,
            following.meeting,
          );
          update.answers[key] = [];
        }
        update.choices = {
          ...(update.choices ?? data.choices),
          [repair.id]: repair.choice,
        };
        update.skipped = {
          ...(update.skipped ?? data.skipped),
          [repair.id]: false,
        };
      }
    }
    patch(slot, update);
  }
  function startQuestion(id, key) {
    const next = tripState(id).items[0];
    if (next?.id !== key || !Number.isInteger(assignedEntry(key)?.initiative))
      return;
    const { edition, trip } = tripState(id);
    patch("week:" + id, {
      initiating: key,
      edition,
      allowChanges: !!trip.allowChanges,
    });
    const retry = read("retry:" + key);
    if (Number.isInteger(retry?.due))
      write("retry:" + key, {
        ...retry,
        choice: assignedEntry(key).initiative,
        proposal: undefined,
      });
  }
  function restartTrip(id) {
    const current = tripState(id).edition;
    patch("week:" + id, {
      allowChanges: true,
      edition: current == null ? 0 : (current + 1) % 2,
      answers: {},
      pending: {},
      choices: {},
      skipped: {},
      proposals: {},
      initiating: null,
    });
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
    startQuestion,
    restartTrip,
  };
}
