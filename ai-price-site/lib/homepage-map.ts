import "server-only";
import { geoNaturalEarth1, geoPath, geoCentroid, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import atlas from "world-atlas/countries-110m.json";
import { getCountryCodeForMapFeature } from "./country-map-codes";
// Natural Earth atlas is already a repository dependency. Geometry stays server-side.
const collection = feature(atlas as never, atlas.objects.countries as never) as unknown as GeoJSON.FeatureCollection;
const countries = collection.features.filter(item=>Number(item.id)!==10);
const world = {type:"FeatureCollection",features:countries} as GeoJSON.FeatureCollection;
const projection = geoNaturalEarth1().fitExtent([[16,16],[984,404]], world);
const path = geoPath(projection);
export const homepageMap = {
  land: path(world as GeoPermissibleObjects) ?? "",
  points: Object.fromEntries(countries.flatMap(item=>{
    const code = getCountryCodeForMapFeature(item as {id?:string|number;properties?:{name?:string}});
    const point = projection(geoCentroid(item));
    return code && point ? [[code,point.map(value=>Math.round(value*100)/100)]] : [];
  })) as Record<string,number[]>,
};
