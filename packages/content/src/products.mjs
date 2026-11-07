// Fictional products for example screens (content/products.yaml). A mock or a notification block names one with
// `app: <id>`; the compiler swaps the id for the product, so the player always gets { id, name, color, icon, domain }.
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export function loadProducts(contentRoot) {
  const f = path.join(contentRoot, "products.yaml");
  return fs.existsSync(f) ? yaml.load(fs.readFileSync(f, "utf8")) || {} : {};
}

/** Returns a copy of `node` with every `app: "<id>"` replaced by its product. Unknown ids are errors. */
export function resolveProducts(node, products, errors, where) {
  if (Array.isArray(node)) return node.map((n) => resolveProducts(n, products, errors, where));
  if (!node || typeof node !== "object") return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === "app" && typeof v === "string") {
      const p = products[v];
      if (!p) errors.push(`${where}: unknown product app: ${v} (add it to content/products.yaml)`);
      out[k] = p ? { id: v, ...p } : v;
    } else out[k] = resolveProducts(v, products, errors, where);
  }
  return out;
}
