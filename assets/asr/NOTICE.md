# 本机日语语音识别

网站只在学习者点击「开口回答」时加载以下两个文件，模型原始文件内容和浏览器库均未修改。

- **vosk-model-small-ja-0.22** 来自 Alpha Cephei。上游将日语小模型按 Apache License 2.0 发布。本站把官方 ZIP 原有的目录和文件重打包为以 `model/` 为根的 gzip tar，以便浏览器解包。原始 ZIP 的 SHA-256 是 `efa092d280153a77615e9e0c7d7283e93e600de3d19d3bec686c57ef19d52eac`。[官方模型与许可表](https://alphacephei.com/vosk/models) · [原始下载](https://alphacephei.com/vosk/models/vosk-model-small-ja-0.22.zip)
- **vosk-browser 0.0.8**，Ciaran O’Reilly 及贡献者，Apache License 2.0。本站使用 npm 发布包中原样的 `dist/vosk.js`，包括其 Vosk WebAssembly 工作线程。[项目](https://github.com/ccoreilly/vosk-browser) · [固定版本](https://www.npmjs.com/package/vosk-browser/v/0.0.8) · [Vosk API](https://github.com/alphacep/vosk-api)
- 本目录包含 [Apache License 2.0 正文](./LICENSE.txt)。课程示范音频的来源另见[日语配音署名](../audio/CREDITS.md)。
