import test from "node:test";
import assert from "node:assert/strict";
import { formatPublicPrice } from "./public-price-format.ts";
import { readdirSync, statSync } from "node:fs";

test("formatter reuse preserves every currency symbol, locale, precision and rounding result", () => {
  const symbols: Record<string,string> = {CNY:"¥",USD:"$",JPY:"JP¥",HKD:"HK$",TWD:"NT$",EUR:"€",GBP:"£",CHF:"CHF"};
  for (const locale of ["zh-CN","en-US","de-DE"]) for (const digits of [0,2,4]) {
    const reference = new Intl.NumberFormat(locale,{minimumFractionDigits:digits,maximumFractionDigits:digits});
    for (const [currency,symbol] of Object.entries(symbols)) for (const value of [0,-0,1.005,-12.345,1234567.89]) {
      assert.equal(formatPublicPrice(value,` ${currency.toLowerCase()} `,locale,digits),`${symbol} ${reference.format(value)}`);
    }
  }
  assert.equal(formatPublicPrice(NaN,"USD"),"");
  assert.equal(formatPublicPrice(Infinity,"USD"),"");
  assert.throws(()=>formatPublicPrice(1,"USD","zh-CN",-1),RangeError);
});

test("a thousand animation values allocate one formatter, not one per frame", () => {
  const original = Intl.NumberFormat;
  let allocations = 0;
  Intl.NumberFormat = new Proxy(original,{construct(target,args,newTarget){allocations++;return Reflect.construct(target,args,newTarget);}});
  try {
    for(let frame=0;frame<1000;frame++) formatPublicPrice(frame/13,"USD","fr-FR",3);
    assert.equal(allocations,1);
  } finally { Intl.NumberFormat = original; }
});

test("original Latin faces plus the optional numeral subset stay within the 50KB font budget", () => {
  const directory = new URL("../assets/fonts/web/",import.meta.url);
  const files = readdirSync(directory).filter(name=>name.endsWith(".woff2"));
  assert.ok(files.includes("geosub-price-numerals-700.woff2"));
  assert.ok(files.reduce((bytes,name)=>bytes+statSync(new URL(name,directory)).size,0)<=50_000);
});
