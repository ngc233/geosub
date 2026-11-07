"use client";
import { useState } from "react";
import Image from "next/image";
/** Same local assets as the legacy private CountryFlag.
 * Kept outside the locked price table so importing it cannot pull that table in. */
export default function HomepageCountryFlag({code}:{code:string}) {
 const [failed,setFailed]=useState(false);
 return <span className="gs-home-flag" aria-hidden="true">{failed?null:<Image src={`/flags/${code.toLowerCase()}.svg`} width={28} height={20} alt="" aria-hidden="true" unoptimized onError={()=>setFailed(true)}/>}</span>;
}
