import assert from "node:assert/strict";
import test from "node:test";
import { getLocalizedCountryName } from "./country-name.ts";

test("country names follow the active locale instead of partial database labels", () => {
  assert.equal(
    getLocalizedCountryName({ code: "PK", locale: "zh", nameZh: "Pakistan", nameEn: "Pakistan" }),
    "巴基斯坦",
  );
  assert.equal(
    getLocalizedCountryName({ code: "EG", locale: "zh", nameZh: "Egypt", nameEn: "Egypt" }),
    "埃及",
  );
  assert.equal(
    getLocalizedCountryName({ code: "DE", locale: "en", nameZh: "德国", nameEn: "Germany" }),
    "Germany",
  );
});

test("country names retain a safe fallback for unknown region codes", () => {
  assert.equal(
    getLocalizedCountryName({ code: "ZZ", locale: "zh", nameZh: "测试地区", nameEn: "Test region" }),
    "测试地区",
  );
});
