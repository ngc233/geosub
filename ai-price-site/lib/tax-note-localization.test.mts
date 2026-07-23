import assert from "node:assert/strict";
import test from "node:test";
import { localizeTaxNote } from "./tax-note-localization.ts";

test("localizes common tax notes for every non-English prepared locale", () => {
  assert.equal(localizeTaxNote("Includes 10% consumption tax", "zh"), "含 10% 消费税");
  assert.equal(localizeTaxNote("Usually includes 10% consumption tax", "ja"), "通常は10% 消費税込み");
  assert.equal(localizeTaxNote("Sales tax varies by state", "ko"), "주별 판매세 상이");
  assert.equal(
    localizeTaxNote("VAT treatment needs review", "es"),
    "El tratamiento del IVA está pendiente de revisión",
  );
  assert.equal(
    localizeTaxNote("Usually VAT-inclusive", "tr"),
    "Genellikle KDV dahildir; son tutar ödeme ekranında gösterilir",
  );
  assert.equal(
    localizeTaxNote("No country tax-rate profile matched yet", "ar"),
    "لا يتوفر حتى الآن ملف ضريبي لهذا البلد، ويُعتمد المبلغ الظاهر عند الدفع في App Store",
  );
});

test("preserves English source notes and hides unknown English notes in future locales", () => {
  const unknown = "Provider-specific tax rule awaiting review";

  assert.equal(localizeTaxNote(unknown, "en"), unknown);
  assert.equal(localizeTaxNote(unknown, "zh"), unknown);
  assert.equal(
    localizeTaxNote(unknown, "ja", { unknownFallback: true }),
    "税務上の取扱いは地域により異なります。最終金額は App Store の決済画面で確認してください",
  );
});
