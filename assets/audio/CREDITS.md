# 日语发音与许可

## 假名示范

五十音逐行跟练的 104 个音取自 **FUN Japanese Learning** 的日语示范录音，经 **Arsalan Anwari** 整理为 Kana Sounds／Kana Trainer。录音集按 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 发布。本站保留整段发音，裁去多余的首尾静音，调整音量并重新编码为 MP3。平假名与片假名使用同一读音。[原课程](https://funjapaneselearning.com/katakana-course/) · [录音集与许可](https://huggingface.co/datasets/arsalan-anwari/kana-sounds) · [固定版音频目录](https://github.com/arsalan-anwari/kana-trainer/tree/88cbdb0ae60b3bb821d4f0cd4961199990998521/data/audio) · [逐字文件对照](../../scripts/kana-recordings.json)

## 真人词汇录音

52 个词使用 **[Tofugu](https://www.tofugu.com/)** 和 **[WaniKani](https://www.wanikani.com/)** 发布的日语母语者录音。词条按日语写法和假名读音匹配。本项目调整了首尾静音与音量，并转码为 MP3。这些音频及相应改编沿用 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。[原录音与作者说明](https://github.com/tofugu/japanese-vocabulary-pronunciation-audio/tree/9725e0e7d628ab616e8b14e126d3daa33eba8d36) · [逐词文件对照](../../scripts/word-recordings.json)

「青（あお）」使用 marsian 在 Wikimedia Commons 发布的日语母语者录音。作者将其置于公有领域。本站调整了首尾静音与音量并转码。[原文件与授权](https://commons.wikimedia.org/wiki/File:Ja-ao-blue.ogg)

## 句子与角色配音

其他情景词、句子和学习者的示范回应使用 **VOICEVOX Nemo** 在本地合成。使用合成音频时请保留 VOICEVOX Nemo 署名，并遵守其使用条款。[官方说明与条款](https://voicevox.hiroshiba.jp/nemo/term/) · [官方声库](https://github.com/VOICEVOX/voicevox_vvm)

在相近音练习中，「ビル／ビール」「病院／美容院」和「記念／禁煙」使用同一 VOICEVOX Nemo 女声 1 专门合成，便于在一致的音色与语速下比较。课程原有的「病院」真人词汇示范继续用于原课。其余对照组复用各自同一声线的已有录音。发音学习延伸阅读见[东京外国语大学的拗音教学](https://www.coelang.tufs.ac.jp/mt/ja/pmod/practical/01-11-01.php)。

## 重新生成

给生成脚本的 `--recordings` 目录准备三组输入。将上述固定版 Kana Trainer 的 `data/audio/` 放入 `audio/`，将 Tofugu／WaniKani 仓库对应的 `lib/mp3/` 放入同名目录，另将青的原始 Ogg 放入 `commons/Ja-ao-blue.ogg`。两个 JSON 对照表都使用相对于这个目录的路径。用 `scripts/generate_audio.py --help` 可查看引擎及字典参数。
