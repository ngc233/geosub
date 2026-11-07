import "server-only";
import { geoNaturalEarth1, geoCentroid } from "d3-geo";
import { feature } from "topojson-client";
import atlas from "world-atlas/countries-110m.json";
import { getCountryCodeForMapFeature } from "./country-map-codes";
// Natural Earth atlas is already a repository dependency. Geometry stays server-side.
const collection = feature(atlas as never, atlas.objects.countries as never) as unknown as GeoJSON.FeatureCollection;
const countries = collection.features.filter(item=>Number(item.id)!==10);
const world = {type:"FeatureCollection",features:countries} as GeoJSON.FeatureCollection;
const projection = geoNaturalEarth1().fitExtent([[10,8],[590,212]], world);
// Canvas v33 geometry only. No example products, prices or statistics are used.
const landMask: number[][][] = [[[13,26],[32,33],[38,47]],[[3,6],[9,17],[21,26],[33,35],[41,59]],[[2,19],[22,24],[26,27],[32,59]],[[3,19],[22,22],[31,57]],[[8,20],[28,53],[56,56]],[[9,20],[29,52],[53,53]],[[9,18],[28,51],[53,53]],[[10,17],[29,31],[34,50],[51,53]],[[11,16],[28,50]],[[12,13],[16,17],[27,39],[41,45],[46,50]],[[13,15],[27,38],[42,44],[46,48],[50,50]],[[15,16],[18,19],[27,37],[42,43],[46,47],[50,50]],[[17,21],[28,38],[46,50]],[[17,22],[31,37],[46,52]],[[16,24],[32,36],[47,55]],[[17,23],[32,36],[51,53]],[[18,23],[32,37],[50,54]],[[18,22],[32,35],[37,37],[49,55]],[[18,21],[32,35],[49,55]],[[18,20],[52,55],[59,59]],[[18,19],[54,54],[58,58]],[[17,19]]];
const land = landMask.flatMap((ranges,row)=>ranges.map(([from,to])=>`M${from*10},${row*10}h${(to-from+1)*10}v10h-${(to-from+1)*10}Z`)).join("");
const canvasPositions: Record<string,number[]> = {TR:[35.8,6.5],IN:[43,9.5],PK:[41.7,8],EG:[35,8.7],NG:[31.3,11.5],PH:[50.3,11],BR:[21.7,14.7],MX:[13,9.2],JP:[53,7],US:[13.7,6.5],GB:[29.4,4.2],DE:[31.8,4.6],CH:[31.1,5.4],AU:[52.3,17.2]};
export const homepageMap = {
  land,
  points: Object.fromEntries(countries.flatMap(item=>{
    const code = getCountryCodeForMapFeature(item as {id?:string|number;properties?:{name?:string}});
    const reference = code && canvasPositions[code];
    const point = reference ? reference.map(value=>(value+0.5)*10) : projection(geoCentroid(item));
    return code && point ? [[code,point.map(value=>Math.round(value*100)/100)]] : [];
  })) as Record<string,number[]>,
};
