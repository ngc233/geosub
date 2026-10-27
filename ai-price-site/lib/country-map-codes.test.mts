import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getCountryCodeForMapFeature } from "./country-map-codes.ts";

const atlas = JSON.parse(readFileSync(new URL("../node_modules/world-atlas/countries-110m.json", import.meta.url), "utf8"));
const registry = JSON.parse(readFileSync(new URL("../../geosub-backend/data/apple-music-official-markets.json", import.meta.url), "utf8"));

test("maps globally published regions omitted by the former common-country list", () => {
  for (const [id, code] of [[643, "RU"], [288, "GH"], [352, "IS"], [398, "KZ"], [804, "UA"], [158, "TW"]] as const) {
    assert.equal(getCountryCodeForMapFeature({ id }), code);
    assert.equal(getCountryCodeForMapFeature({ id: String(id).padStart(3, "0") }), code);
  }
});

test("Kosovo uses its exact atlas name without conflating unidentified features", () => {
  assert.equal(getCountryCodeForMapFeature({ properties: { name: "Kosovo" } }), "XK");
  for (const name of ["Somaliland", "N. Cyprus", "Unknown"]) {
    assert.equal(getCountryCodeForMapFeature({ id: -99, properties: { name } }), undefined);
  }
  assert.equal(getCountryCodeForMapFeature({}), undefined);
  assert.equal(getCountryCodeForMapFeature({ id: "" }), undefined);
});

test("every published region with atlas geometry has a unique canonical identity", () => {
  const geometries = atlas.objects.countries.geometries as Array<{ id?: string; properties?: { name?: string } }>;
  const identified = geometries.map(getCountryCodeForMapFeature).filter(Boolean);
  assert.equal(new Set(identified).size, identified.length);
  const missing = geometries.filter((geo) => !getCountryCodeForMapFeature(geo)).map((geo) => geo.properties?.name).sort();
  assert.deepEqual(missing, ["N. Cyprus", "Somaliland"]);
  const markets = new Set(registry.markets.map((market: { country_code: string }) => market.country_code));
  const mapped = identified.filter((code) => markets.has(code));
  assert.equal(mapped.length, 147);
  assert.ok(mapped.includes("RU") && mapped.includes("GH") && mapped.includes("IS") && mapped.includes("XK"));
});
