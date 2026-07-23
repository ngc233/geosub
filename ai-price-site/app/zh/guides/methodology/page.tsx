import type { Metadata } from "next";
import PublicGuidePage from "../../../../components/PublicGuidePage";

export const metadata: Metadata = {
  title: "价格数据方法",
  description:
    "了解 GeoSub 如何采集、检查并标注 App Store 地区订阅价格，以及页面上不同日期的含义。",
};

export default function MethodologyPage() {
  return (
    <PublicGuidePage
      eyebrow="Methodology"
      title="GeoSub 如何检查订阅价格"
      description="每条地区价格都会先匹配套餐，再检查币种、计费周期和样本一致性；只有可直接比较的数据才会展示。"
      sections={[
        {
          title: "保留采集时的原始信息",
          body: "每条记录保留产品、套餐、国家或地区、本地币种、计费周期和采集时间。换算价格不会覆盖平台原始标价。",
        },
        {
          title: "检查套餐、稳定性和价格范围",
          body: "系统结合套餐匹配、重复样本和同类地区价格范围识别币种、小数点及计费周期异常。不一致的价格会暂缓展示，而不是强行进入排行。",
        },
        {
          title: "分别计算四种日期",
          body: "价格采集日期、汇率基准日期、套餐复核日期和页面更新时间含义不同，会分别计算和展示，避免把汇率更新误认为平台调价。",
        },
      ]}
      note="公开比较用于辅助理解地区价格。服务可用性、税费和最终结算金额仍可能在采集后发生变化。"
    />
  );
}
