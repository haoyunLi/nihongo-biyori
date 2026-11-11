const rows = [
  ["元音", "あいうえお", "a i u e o"],
  ["K 行", "かきくけこ", "ka ki ku ke ko"],
  ["S 行", "さしすせそ", "sa shi su se so"],
  ["T 行", "たちつてと", "ta chi tsu te to"],
  ["N 行", "なにぬねの", "na ni nu ne no"],
  ["H 行", "はひふへほ", "ha hi fu he ho"],
  ["M 行", "まみむめも", "ma mi mu me mo"],
  ["Y 行", "や・ゆ・よ", "ya - yu - yo"],
  ["R 行", "らりるれろ", "ra ri ru re ro"],
  ["W 行", "わ・・・を", "wa - - - o"],
  ["拨音", "ん・・・・", "n - - - -"],
];

export const kanaRows = rows.map(([name, letters, romaji]) => ({
  name,
  items: [...letters].map((hira, index) =>
    hira === "・"
      ? null
      : {
          hira,
          kata: String.fromCodePoint(hira.codePointAt(0) + 96),
          romaji: romaji.split(" ")[index],
        },
  ),
}));

export const kanaNotes = {
  あ: "自然张口，舌头放松，一拍读完。",
  い: "嘴角微微向两边展开，舌面抬高。",
  う: "嘴唇轻合、少向前突出，保持短促的一拍。",
  え: "嘴稍张，发一个稳定的元音，避免滑成“ei”。",
  お: "嘴唇略圆，读一个稳定的 o 音，避免拖成“ou”。",
  し: "罗马字写 shi。嘴角轻展，舌面靠近上腭。",
  ち: "罗马字写 chi。先短暂阻住气流，再放开发音。",
  つ: "罗马字写 tsu。舌尖先抵住齿龈，再让气流擦出。",
  ふ: "罗马字写 fu。嘴唇轻轻靠近，让气流从中间擦过。",
  へ: "单独读 he。作方向助词时读 e。",
  は: "单独读 ha。作提示话题的助词时读 wa。",
  を: "现代标准日语通常读 o。输入法里常用 wo 打出它，最常用作宾语助词。",
  ん: "独占一拍。让声音从鼻腔通过，后面别补一个元音。",
};

const extraRows = [
  ["浊音 · G", "が ぎ ぐ げ ご", "ga gi gu ge go"],
  ["浊音 · Z", "ざ じ ず ぜ ぞ", "za ji zu ze zo"],
  ["浊音 · D", "だ ぢ づ で ど", "da ji zu de do"],
  ["浊音 · B", "ば び ぶ べ ぼ", "ba bi bu be bo"],
  ["半浊音 · P", "ぱ ぴ ぷ ぺ ぽ", "pa pi pu pe po"],
  ["拗音 · K", "きゃ きゅ きょ", "kya kyu kyo"],
  ["拗音 · S", "しゃ しゅ しょ", "sha shu sho"],
  ["拗音 · T", "ちゃ ちゅ ちょ", "cha chu cho"],
  ["拗音 · N", "にゃ にゅ にょ", "nya nyu nyo"],
  ["拗音 · H", "ひゃ ひゅ ひょ", "hya hyu hyo"],
  ["拗音 · M", "みゃ みゅ みょ", "mya myu myo"],
  ["拗音 · R", "りゃ りゅ りょ", "rya ryu ryo"],
  ["拗音 · G", "ぎゃ ぎゅ ぎょ", "gya gyu gyo"],
  ["拗音 · J", "じゃ じゅ じょ", "ja ju jo"],
  ["拗音 · B", "びゃ びゅ びょ", "bya byu byo"],
  ["拗音 · P", "ぴゃ ぴゅ ぴょ", "pya pyu pyo"],
];

export const extraKana = extraRows.map(([name, letters, romaji]) => ({
  name,
  items: letters.split(" ").map((hira, index) => ({
    hira,
    kata: [...hira]
      .map((c) => String.fromCodePoint(c.codePointAt(0) + 96))
      .join(""),
    romaji: romaji.split(" ")[index],
  })),
}));
