export const metadata = { title: "GeoSub V1 本地样例", robots: { index: false, follow: false } };
export default function PreviewRoot({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body style={{ margin: 0 }}>{children}</body></html>;
}
