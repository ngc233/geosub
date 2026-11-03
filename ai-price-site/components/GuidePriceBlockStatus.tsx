import Link from "next/link";
import {ArrowRight} from "lucide-react";
import PublicDataRetry from "./PublicDataRetry";
/** Shared rendering for real read failures/empty evidence and the guarded local state canvas. */
export default function GuidePriceBlockStatus({status,href}:{status:"empty"|"error";href:string}) {
  return <section className="gs-guide-price-block" data-article-price-block={status}>
    <h2>当前报价与证据</h2>
    {status==="error"?<><p role="alert">暂时无法读取价格，正文仍可正常阅读。</p><PublicDataRetry/></>:<p role="status">暂无可发布价格。</p>}
    <Link href={href}>{status==="error"?"前往价格页":"查看价格页与来源"}<ArrowRight aria-hidden="true"/></Link>
  </section>;
}
