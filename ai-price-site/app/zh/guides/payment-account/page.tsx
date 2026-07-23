import type { Metadata } from "next";
import PublicGuidePage from "../../../../components/PublicGuidePage";

export const metadata: Metadata = {
  title: "支付与账号",
  description: "订阅前核对服务可用地区、账号归属、付款方式、账单信息和最终结算金额。",
};

export default function GuideCategoryPage() {
  return (
    <PublicGuidePage
      eyebrow="Payment & Account"
      title="订阅前检查账号与付款条件"
      description="地区价格可用于比较成本，但能否购买取决于服务覆盖、账号地区和平台接受的付款信息。"
      sections={[
        {
          title: "确认服务和套餐在当地可用",
          body: "同一服务可能只在部分国家提供，套餐名称和权益也可能不同。先在官方应用或结算页确认你的地区确实提供该套餐。",
        },
        {
          title: "核对账号地区与付款方式",
          body: "Apple ID 或服务账号地区、发卡国家、账单地址和付款币种可能需要一致。不要为了低价提交虚假地区或账单信息。",
        },
        {
          title: "以结算页金额作为最终成本",
          body: "银行卡换汇费、平台汇率、税费和试用资格可能只在付款前显示。GeoSub 的换算价格用于比较，不是扣款承诺。",
        },
      ]}
      note="跨地区订阅可能触发平台风控或违反服务条款。请遵守账号、付款与地区规则。"
    />
  );
}
