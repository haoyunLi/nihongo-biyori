const messages = {
  quiet: "声音太轻。把麦克风靠近一点，先听完示范，再用平常说话的音量读一遍。",
  noise: "这段声音里很难辨出语音。等示范播完，到安静一点的地方再读。",
  clipped: "录音的响声失真了。把麦克风稍微移远，用平常的音量再读。",
  length:
    "录到的声音和示范长度相差较大。按下录音后，从第一个音连续读到句尾，再点停止。",
  tempo:
    "两段的节奏差异比较明显，但仅凭这遍还分不清是哪一段需要调整。跟着示范轻点节拍，再读一次。",
  alignment:
    "这次没能稳稳对应到各拍。先听一次示范，照着上面同一句连贯地读一遍。",
  reference: "暂时无法取得这句的逐拍示范。可以依次回听示范和自己，或稍后再试。",
  unavailable: "这次未能完成本机分析。可以继续回听，也可以重新录一次。",
};
const ms = (value) => Math.round(value / 10) * 10 + " 毫秒";
function name(unit) {
  const start = unit.first + 1,
    end = unit.first + unit.labels.length;
  return (
    (start === end ? `第 ${start} 拍` : `第 ${start}–${end} 拍`) +
    "「" +
    unit.labels.join("・") +
    "」"
  );
}
function instruction(unit, short, single) {
  if (single && unit.labels.length === 1)
    return short
      ? "听示范从起音到收音有多长。自己读时把这个音稍微留长一点，再自然收住。"
      : "跟着示范轻点一下，读出这个音后稍早收住，再依次听示范和自己。";
  if (unit.phones.includes("q"))
    return short
      ? "跟着整句话轻轻点拍。点到「っ」时先稳住下一个辅音，等下一下再放出后面的音。"
      : "点到「っ」时稳住下一个辅音，下一下就放开。试着把中间的停顿收短一点。";
  if (unit.phones.includes("N"))
    return short
      ? "点到「ん」时把鼻音留住一拍，再接后面的音。到词尾就轻轻收住。"
      : "把「ん」轻轻哼过一拍就收住，别在鼻音后拖出另一拍。";
  if (unit.labels.length > 1)
    return short
      ? "一边轻点一边连读这几拍。保持同一个元音，让声音一直延续到最后一下再换音。"
      : "这几拍共用一个元音。手指点到最后一下就准备换音，把拖长的尾巴收回来。";
  if (unit.labels[0].length > 1)
    return short
      ? "把大假名和小假名合在一次点拍里读。给整个音留足一拍，再接下一音。"
      : "大假名和小假名一起占一拍。把它们一口连出来，下一拍就换音。";
  return short
    ? "先轻点出整句的节奏。点到这一拍时，让元音多留一点，再自然接下去。"
    : "用手指给这句话打拍子。这一拍的元音稍早收住，顺着节奏接下去。";
}
function append(parent, tag, text, cls) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (cls) node.className = cls;
  parent.append(node);
  return node;
}
function comparison(parent, last, result) {
  const before = last?.units?.[last.target];
  if (!before) return;
  const now = result.units?.find((u) => u.first === before.first);
  if (!now?.reliable) {
    append(
      parent,
      "p",
      "上一遍练的是" + name(before) + "。这一遍边界不够清楚，暂时无法比较。",
      "rhythm-change",
    );
    return;
  }
  const diff = Math.abs(Math.log(before.ratio)) - Math.abs(Math.log(now.ratio));
  const verdict =
    diff > 0.12
      ? "更接近示范节奏了"
      : diff < -0.12
        ? "与示范节奏的差距变大了"
        : "两遍的差别不明显";
  const basis = result.single ? "按所选示范速度比较" : "按每遍语速折算";
  const pct = (u) => Math.round(100 * u.ratio) + "%";
  append(
    parent,
    "p",
    `再读对照 · ${name(before)}${verdict}。${basis}，上一遍是示范的 ${pct(before)}，这遍是 ${pct(now)}。`,
    "rhythm-change",
  );
}
export function renderFeedback(parent, result, last) {
  parent.replaceChildren();
  if (result.status !== "measured") {
    append(parent, "h3", "这次暂时无法判断拍长");
    append(parent, "p", messages[result.reason] || messages.unavailable);
    comparison(parent, last, result);
    return;
  }
  const unit = result.units[result.target];
  if (unit) {
    const short = unit.ratio < 1;
    append(parent, "h3", name(unit) + (short ? "可能偏短" : "可能偏长"));
    append(parent, "p", instruction(unit, short, result.single));
    append(
      parent,
      "p",
      `这遍约 ${ms(unit.userMs)}，${result.single ? "示范" : "按你这遍语速折算的示范"}约 ${ms(unit.expectedMs)}。`,
      "rhythm-estimate",
    );
  } else {
    append(
      parent,
      "h3",
      result.single
        ? "这一段没有明显的总时长差"
        : "可对齐的部分没有明显的局部时长差",
    );
    if (!result.single && (result.tempo > 1.32 || result.tempo < 0.75))
      append(
        parent,
        "p",
        result.tempo > 1
          ? "你这遍整体读得慢一些，各拍之间的比例也可以这样练。"
          : "你这遍整体读得快一些，可以再听示范，留意每一拍是否清楚。",
      );
  }
  if (result.units.some((u) => u.labels.length > 1))
    append(
      parent,
      "p",
      "相连的长元音按整段比较，中间的分界很难从声音中听出来。",
      "rhythm-estimate",
    );
  comparison(parent, last, result);
  const details = append(parent, "details");
  append(details, "summary", "查看各拍的估计时长");
  append(
    details,
    "p",
    result.single
      ? "这一段按所选示范速度比较，数字取整到 10 毫秒。"
      : "下表按本遍语速折算示范时长，数字取整到 10 毫秒。",
  );
  const table = append(details, "table"),
    head = append(append(table, "thead"), "tr");
  for (const label of ["拍", "这遍", "示范参考"])
    append(head, "th", label).scope = "col";
  const body = append(table, "tbody");
  for (const u of result.units) {
    const row = append(body, "tr");
    if (u === unit) row.classList.add("rhythm-focus");
    append(row, "th", name(u)).scope = "row";
    if (u.reliable) {
      append(row, "td", ms(u.userMs));
      append(row, "td", ms(u.expectedMs));
    } else append(row, "td", "边界不清楚").colSpan = 2;
  }
}
