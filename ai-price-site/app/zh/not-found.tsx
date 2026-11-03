import PublicPageState from "../../components/PublicPageState";

export default function NotFound() {
  return <PublicPageState state="not-found" title="找不到这个页面"
    description="链接可能有误，或该内容暂未公开。你可以返回首页，或从已收录的价格页面继续浏览。" />;
}
