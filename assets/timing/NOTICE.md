# 日语节奏分析的语音资源

本站使用 Julius Dictation Kit 的 JNAS 16-mixture monophone acoustic model。此模型由京都大学河原研究室和名古屋工业大学李研究室提供。感谢两所研究室提供日语声学模型。

Copyright (c) 1991–2019 Kawahara Lab., Kyoto University.
Copyright (c) 2005–2019 Lee Lab., Nagoya Institute of Technology.

日和手帖项目于 2026-11-12 将 HTK 模型转换为浏览器可读取的 float32 混合参数和 JSON 状态转移表。声学参数沿用上游发布值，转换包含方差倒数和对数概率。源模型文件为 model/phone_m/jnas-mono-16mix-gid.hmmdefs。JNAS 代表 ASJ Continuous Speech Corpus — Japanese Newspaper Article Sentences。

- [固定版本的上游文件](https://github.com/julius-speech/dictation-kit/blob/1ceb4dec245ef482918ca33c55c71d383dce145e/model/phone_m/jnas-mono-16mix-gid.hmmdefs)
- [完整许可（日英双语）](./LICENSE.txt)
- [模型转换脚本](../../scripts/pack_timing_model.py)
- [示范读音生成脚本](../../scripts/mora_plans.py)，使用站内配音所用的 VOICEVOX 日语前端与词典。[示范语音署名](../audio/CREDITS.md)
