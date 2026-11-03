"use client";

import { ArrowLeftRight } from "lucide-react";
import { PublicButton, PublicCard, PublicIconButton, PublicInput, PublicSelect, type PublicSelectOption } from "./ui/PublicControls";
import type { CurrencyConverterCopy } from "../lib/currency-converter-copy";
import type { DisplayCurrency } from "../lib/display-currency";

type Props={copy:CurrencyConverterCopy;amount:string;from:DisplayCurrency;to:DisplayCurrency;options:PublicSelectOption[];onAmount:(value:string)=>void;onFrom:(value:DisplayCurrency)=>void;onTo:(value:DisplayCurrency)=>void;onSwap:()=>void;lead:string;result:string;rateLine:string|null;quick:{value:number;label:string}[];onQuick:(value:number)=>void;rows:{currency:string;name:string;value:string}[];foot:string};

/** Only presentation: parsing, rate eligibility and calculations stay with the existing consumer. */
export default function UnifiedCurrencyConverterView({copy,amount,from,to,options,onAmount,onFrom,onTo,onSwap,lead,result,rateLine,quick,onQuick,rows,foot}:Props) {
  return <PublicCard className="gs-aux-converter-widget" data-gs-converter>
    <div className="gs-aux-converter-controls"><div className="gs-aux-converter-source"><PublicInput label={copy.amountLabel} id="converter-amount" aria-label={copy.amountAria} value={amount} inputMode="decimal" onChange={event=>onAmount(event.target.value)}/><PublicSelect label={copy.fromAria} hideLabel options={options} value={from} onChange={value=>onFrom(value as DisplayCurrency)}/></div><PublicIconButton title={copy.swap} aria-label={copy.swapAria} onClick={onSwap}><ArrowLeftRight aria-hidden="true"/></PublicIconButton><div><span className="gs-aux-field-label">{copy.toLabel}</span><PublicSelect label={copy.toAria} hideLabel options={options} value={to} onChange={value=>onTo(value as DisplayCurrency)}/></div></div>
    <div className="gs-aux-converter-result" aria-live="polite"><p>{lead}</p><strong data-converter-result>{result}</strong>{rateLine&&<p data-converter-rate>{rateLine}</p>}</div>
    <div className="gs-aux-converter-lower"><div><h2>{copy.quickTitle}</h2><p className="gs-aux-small">{copy.quickDescription}</p><div className="gs-aux-quick-amounts">{quick.map(item=><PublicButton variant="secondary" key={item.value} onClick={()=>onQuick(item.value)}>{item.label}</PublicButton>)}</div></div><div><h2>{copy.comparisonTitle}</h2><div className="gs-aux-rate-list">{rows.map(row=><div className="gs-aux-rate-row" data-converter-comparison={row.currency} key={row.currency}><span>{row.name} <small>{row.currency}</small></span><strong className="gs-aux-number">{row.value}</strong></div>)}</div></div></div>
    <div className="gs-aux-converter-foot"><span>{foot}</span><span>{copy.resultNote}</span></div>
  </PublicCard>;
}
