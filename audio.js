import { clipStem } from "./clip-source.js?v=11";

const audioDirectory = new URL("./assets/audio/", import.meta.url);
let active = null;

export function stopAudio() {
  active?.cancel();
}

function nativeVoice(task, text, slow) {
  const engine = globalThis.speechSynthesis;
  const VoiceLine = globalThis.SpeechSynthesisUtterance;
  if (!engine || !VoiceLine) {
    task.fail("未能播放这段录音。请检查网络，然后再试。");
    return;
  }

  const voices = engine.getVoices();
  const voice = voices.find((item) => /^ja(?:[-_]|$)/i.test(item.lang));
  if (voices.length && !voice) {
    task.fail("录音暂时无法播放，设备也未安装日语语音。请检查网络后重试。");
    return;
  }

  const isHiraganaSound = /^[ぁ-ゖ](?:[ゃゅょ])?$/u.test(text);
  const pronunciation = isHiraganaSound
    ? [...text].map((c) => String.fromCodePoint(c.codePointAt(0) + 96)).join("")
    : text;
  const line = new VoiceLine(pronunciation);
  line.lang = "ja-JP";
  line.rate = slow ? 0.74 : 0.95;
  if (voice) line.voice = voice;
  line.onend = task.finish;
  line.onerror = (event) => {
    if (event.error === "canceled" || event.error === "interrupted")
      task.finish();
    else task.fail("设备未能朗读日语。请检查声音设置并再次点击播放。");
  };
  task.cleanup = () => {
    line.onend = null;
    line.onerror = null;
  };
  task.interrupt = () => engine.cancel();
  try {
    engine.speak(line);
  } catch {
    task.fail("设备未能朗读日语。请检查声音设置并再次点击播放。");
  }
}

export function speak(text, slow = false, reading = "", learner = false) {
  stopAudio();
  const words = String(text || "").trim();
  if (!words) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const task = {
      cleanup() {},
      interrupt() {},
      finish() {
        settle();
      },
      fail(message) {
        settle(new Error(message));
      },
      cancel() {
        if (active !== task) return;
        const interrupt = task.interrupt;
        settle();
        interrupt();
      },
    };
    function settle(error) {
      if (active !== task) return;
      active = null;
      task.cleanup();
      if (error) reject(error);
      else resolve();
    }
    active = task;

    const file = clipStem(words, reading, learner);
    if (!file || typeof globalThis.Audio !== "function") {
      nativeVoice(task, words, slow);
      return;
    }
    const player = new Audio(new URL(file + ".mp3?v=3", audioDirectory).href);
    player.playbackRate = slow ? 0.84 : 1;
    player.preservesPitch = true;
    task.cleanup = () => {
      player.onended = null;
      player.onerror = null;
    };
    task.interrupt = () => player.pause();
    const fallback = () => {
      if (active !== task || !player.onerror) return;
      task.cleanup();
      player.pause();
      nativeVoice(task, words, slow);
    };
    player.onerror = fallback;
    player.onended = task.finish;
    player.play().catch((error) => {
      if (active !== task || !player.onerror) return;
      if (error.name === "NotAllowedError") {
        task.fail("浏览器阻止了声音。请允许此网站播放音频，再点击播放。");
      } else {
        fallback();
      }
    });
  });
}

globalThis.addEventListener?.("pagehide", stopAudio);
