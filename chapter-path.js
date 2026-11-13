export const units = [
  {
    title: "第一周 · 听见一拍，认出假名",
    skill: "每天认一组声音，用短词听辨。清音学完后，再练浊音、长音和促音。",
    ids: ["f01", "f02", "f03", "f04", "f05", "f06", "f07"],
  },
  {
    title: "第二周 · 进店、问路、和同好开口",
    skill:
      "从片假名菜单和一声招呼，到介绍自己、问路、聊喜好和点一份午饭。进入长句练习前，先试着读出コーヒー，再说一次「これをください」。",
    ids: ["f08", "m01", "f09", "f10", "t01", "c01", "t04"],
  },
  {
    title: "第三周 · 从点单到应对变化",
    skill: "追加点单、问价格、改点和结账；再把请求用在约饭、入住和问站台。",
    ids: ["m02", "t05", "t07", "m03", "t03", "t02", "t08"],
  },
  {
    title: "第四周 · 去展会，完成一次旅行",
    skill: "买票、选周边、问能否拍照，听懂婉拒，最后把整天的需求用日语说出来。",
    ids: ["c02", "c03", "c04", "m04", "c05", "t06", "t09"],
  },
];
export const chapterIds = units.flatMap((u) => u.ids);
export const chapterOf = (id) => chapterIds.indexOf(id) + 1;
export function dailyChapter(done, completionDays, day) {
  const next = chapterIds.find((id) => !done.includes(id));
  const today = chapterIds.filter(
    (id) => done.includes(id) && completionDays[id] === day,
  );
  return { next, today, complete: !next };
}
export function routeView(ctx, state, day) {
  const { next, today, complete } = dailyChapter(
    state.done,
    state.completionDays,
    day,
  );
  const anchor = (id) => "#lesson/" + id;
  const link = (id, text, cls = "btn primary") =>
    `<a class="${cls}" href="${anchor(id)}">${text}</a>`;
  const ordinal = (id) => "第 " + chapterOf(id) + " 章";
  const nextLesson = ctx.get(next);
  const lead = complete
    ? "28 章已学完"
    : today.length
      ? "今日目标已完成"
      : "今日一章";
  return `<div class="inner narrow chapter-route"><h1>每日章节</h1><p class="lead">按顺序每天学一章。隔天从上次的位置接着走，也可以点任意一章提前学。<a class="text-link" href="#courses">按主题找课</a></p>
    <section class="chapter-today"><span class="small-label">${lead}</span><h2>${today.length ? today.map((id) => ordinal(id)).join("、") + " 已完成" : complete ? "把学过的日语用起来" : ordinal(next) + " · " + nextLesson.title}</h2>
    <p>${complete || today.length ? "先到今日复习重练到期的题。" : nextLesson.goal}</p><div class="actions">${today.length || complete ? '<a class="btn primary" href="#practice/daily">去今日复习</a>' : link(next, state.positions[next] ? "继续本章" : "开始本章")}${today.length && next ? link(next, "提前学下一章", "tool") : ""}<a class="tool" href="#review/mistakes">打开错题本</a></div></section>
    ${units
      .map(
        (u) =>
          `<section class="chapter-unit"><h2>${u.title}</h2><p>${u.skill}</p><ol start="${chapterOf(u.ids[0])}">${u.ids
            .map((id) => {
              const l = ctx.get(id),
                finished = state.done.includes(id);
              return `<li class="${finished ? "learned" : id === next ? "up-next" : ""}"><a href="${anchor(id)}"><span>${l.title}</span><small>${finished ? "✓ 已完成" : id === next ? "接着学" : l.minutes + " 分钟"}</small></a></li>`;
            })
            .join("")}</ol></section>`,
      )
      .join("")}</div>`;
}
