# 日和手帖

[打开网站](https://haoyunli.github.io/nihongo-biyori/) · [从第一课开始](https://haoyunli.github.io/nihongo-biyori/#lesson/f01/0) · [五十音图](https://haoyunli.github.io/nihongo-biyori/#kana)

为中文零基础学习者设计的 21 节日语小课。从五个元音开始，用中文讲解、日语音频、笔顺动画和情景对话逐步学习。

| 篇章 | 内容 |
| --- | --- |
| 假名与发音 · 10 课 | 元音与拍、平假名各行、浊音与半浊音、拗音、促音、长音、片假名、礼貌句和助词 |
| 旅行日语 · 6 课 | 问路、站台、旅馆入住、餐厅点餐、付款、找回遗失物品 |
| 二次元日语 · 5 课 | 讨论喜欢的作品、展会购票、选购周边、询问拍摄许可、辨别朋友口语和角色台词 |

五十音图的 11 组基础音（含拨音）和 16 组扩展音都有独立跟练页。点行名可逐字听音、看平假名或片假名笔顺，留白跟读，再用旅行及动漫情景词练习和自测。[从あ行开始](https://haoyunli.github.io/nihongo-biyori/#kana/a)

每节课包含分步讲解、例句、分角色对话、听辨题和答题解析。「我来接话」可隐藏学习者的日语台词。星标表达可在复习手帖中翻卡，答错的题会进入错题本。进度、收藏和错题保存在当前浏览器的本地存储中。音频随网站提供，支持慢速播放。

## 练习室

[今日复习](https://haoyunli.github.io/nihongo-biyori/#practice/daily) 每天从已学假名、已学表达、收藏和错题中选最多 5 张卡。没有学习记录时可从五个元音热身。逐行自测里听错的音和词也会排进复习。看假名或听音输入罗马字、听情景词回想中文、看中文开口说日语，或重答听辨题。答错或忘记的卡在本轮结尾再练，次日再见，独立想起的卡逐步延长复习间隔。

[情景接话](https://haoyunli.github.io/nihongo-biyori/#practice) 提供车站、食堂、购物及动漫交流等六个场景。听完对方的话，再用语块组成自己的回答。食堂和展会售票场景可选择不同的回应目标，完成后可听示范并收藏想再练的句子。

## 本地预览

在仓库根目录运行以下命令，然后打开浏览器访问终端显示的地址。

```sh
python3 -m http.server 8000
```

本项目使用原生 HTML、CSS 和 JavaScript 模块。GitHub Pages 从 main 分支根目录发布。课程内容和参考教材在 [lessons.js](./lessons.js)，音频生成过程见 [生成脚本](./scripts/generate_audio.py)。

## 教学与素材

课程参考国际交流基金教材的学习目标和情景设计，站内讲解、情景和题目为本项目编写。延伸阅读见[教材与素材来源](https://haoyunli.github.io/nihongo-biyori/#about)。

- 148 个基本、浊音及小假名字形的笔画取自 [KanjiVG](https://github.com/KanjiVG/kanjivg/tree/610091ce618cf757ed1357a8954cd65283e015d6)，© Ulrich Apel。本站提取了原始路径，数据和衍生笔画沿用 [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)。
- 音图里的 104 个音使用真人录音。情景词结合真人词典录音和 VOICEVOX Nemo，完整句对话分角色配音。[语音署名与许可](./assets/audio/CREDITS.md)
- 嵌入的 Noto Serif SC 为中文标题字体子集。[SIL Open Font License](./assets/fonts/OFL.txt)
- 四幅封面插画使用图像生成工具为本站制作。
