import {
  makeGroups,
  measure,
  compareAlignment,
  comparePart,
} from "./rhythm-align.js?v=8";

async function asset(name, format) {
  const r = await fetch(new URL("./assets/timing/" + name, import.meta.url));
  if (!r.ok) throw new Error("model");
  return r[format]();
}
let resources, reference;
self.onmessage = async ({ data }) => {
  let result;
  try {
    resources ??= Promise.all([
      asset("plans.json?v=9", "json"),
      asset("model.json", "json"),
      asset("jnas.f32", "arrayBuffer"),
    ])
      .then(([plans, metadata, bytes]) => ({
        plans,
        model: { ...metadata, weights: new Float32Array(bytes) },
      }))
      .catch((error) => {
        resources = null;
        throw error;
      });
    const { plans, model } = await resources;
    if (!plans[data.stem])
      result = { status: "uncertain", reason: "reference" };
    else {
      const groups = makeGroups(plans[data.stem], data.reading);
      if (data.part) {
        result = comparePart(
          data.reference,
          data.take,
          groups,
          data.part,
          model,
        );
      } else {
        reference ??= measure(data.reference, groups, model);
        result = compareAlignment(
          reference,
          measure(data.take, groups, model),
          data.slow,
        );
      }
    }
  } catch {
    result = { status: "uncertain", reason: "unavailable" };
  }
  self.postMessage({ id: data.id, result });
};
