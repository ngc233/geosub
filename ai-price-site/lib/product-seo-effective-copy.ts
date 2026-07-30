export function getProductSeoEffectiveCopy({
  productName,
  countryCount,
  configuredTitle,
  configuredDescription,
  configuredH1,
  year = new Date().getFullYear(),
}: {
  productName: string;
  countryCount: number;
  configuredTitle?: string | null;
  configuredDescription?: string | null;
  configuredH1?: string | null;
  year?: number;
}) {
  const coverage =
    countryCount > 0
      ? `${countryCount} 个国家和地区`
      : "不同国家和地区";
  const generatedTitle = `${productName}价格：全球各地区对比（${year}）`;
  const generatedDescription = `比较 ${coverage}的 ${productName} App Store 订阅价格，查看各地区本地货币、美元折算、税费规则、汇率日期与购买力差异，帮助判断更合适的订阅地区。`;
  const generatedH1 = `${productName} 全球订阅价格对比`;
  const title = configuredTitle?.trim();
  const description = configuredDescription?.trim();
  const h1 = configuredH1?.trim();

  return {
    title:
      title && title.length >= 10 && title.length <= 65
        ? title
        : generatedTitle,
    description:
      description && description.length >= 70 && description.length <= 180
        ? description
        : generatedDescription,
    h1: h1 && h1.length >= 10 ? h1 : generatedH1,
  };
}
