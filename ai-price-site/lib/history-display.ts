import type {getPriceHistorySummary} from "./price-records.ts";

export type HistorySummary=ReturnType<typeof getPriceHistorySummary> & {truncated:boolean};
export type HistoryFilters={country:string;plan:string;cycle:string;days:string;direction:string};

/** Filters the original public summary; never recomputes or joins price events. */
export function filterHistory(summary:HistorySummary,filters:HistoryFilters,asOf:number) {
  const cutoff=asOf-Number(filters.days)*86_400_000;
  const matches=(row:HistorySummary["snapshots"][number])=>
    (filters.country==="all"||row.countryCode===filters.country)&&
    (filters.plan==="all"||row.planName===filters.plan)&&
    (filters.cycle==="all"||(row.billingCycle||"unknown")===filters.cycle)&&
    Date.parse(row.observedAt)>=cutoff;
  return {
    snapshots:summary.snapshots.filter(matches),
    events:summary.events.filter(event=>matches(event.after)&&(filters.direction==="all"||event.direction===filters.direction)),
  };
}

export function historyDateTime(value:string) {
  return new Intl.DateTimeFormat("zh-CN",{dateStyle:"medium",timeStyle:"short",timeZone:"UTC"}).format(new Date(value))+" UTC";
}
export function historyMoney(amount:number,currency:string) {
  return new Intl.NumberFormat("zh-CN",{style:"currency",currency,maximumFractionDigits:2}).format(amount);
}
export function historyCountry(code:string) {
  return new Intl.DisplayNames(["zh-CN"],{type:"region"}).of(code)||code;
}
