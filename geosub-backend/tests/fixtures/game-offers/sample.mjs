import {readFileSync} from "node:fs";
import {parseGameStorePage} from "../../../scripts/lib/game-store-offers.mjs";

export const at = "2026-11-23T12:00:00.000Z";
export const xboxId = "9NP019G7NZXT";
export function sample(name, edit = () => {}, locale) {
  const data = JSON.parse(readFileSync(new URL("./" + name + ".json", import.meta.url)));
  edit(data);
  const isXbox = name === "xbox";
  const target = {platform:isXbox ? "xbox" : "ps5", market:"HK", expected_currency:"HKD",
    offer_type:name === "upgrade" ? "upgrade" : "full_game",
    store_product_id:isXbox ? xboxId.toLowerCase() : (name === "upgrade" ? "EP1004-PPSA01547_00-ULTEDTIONUPGRADE" : "EP1004-PPSA01547_00-GTAVISTANDARD001")};
  let html;
  if (isXbox) {
    target.store_url = "https://www.xbox.com/" + (locale || "zh-HK") + "/games/store/grand-theft-auto-vi/" + target.store_product_id;
    html = '<script type="application/ld+json">' + JSON.stringify(data.structured) + '</script><script>window.__PRELOADED_STATE__ = ' +
      JSON.stringify(data.state) + ';</script>';
  } else {
    target.store_url = "https://store.playstation.com/" + (locale || "zh-hant-hk") + "/product/" + target.store_product_id;
    const text = '<script id="env:sample" type="application/json">' + JSON.stringify(data.component) + '</script>';
    const next = {props:{pageProps:{...data.page,batarangs:{cta:{statusCode:"200",text}}}}};
    html = '<script id="__NEXT_DATA__" type="application/json">' + JSON.stringify(next).replaceAll("<", "\\u003c") + '</script>';
  }
  return {target, html, result:parseGameStorePage(target,target.store_url,html,at)};
}
