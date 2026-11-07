import BrandIcon from "./BrandIcon";
/** Reuse the live site's approved local artwork. Adjacent text owns the name;
 * decorative mode also keeps failed/missing assets out of link anchor text. */
export default function HomepageProductMark({product,className=""}:{product:{slug:string;name:string};className?:string}) {
  return <span className={`gs-home-product-mark ${className}`} aria-hidden="true"><BrandIcon product={product} decorative className="gs-home-brand-logo"/></span>;
}
