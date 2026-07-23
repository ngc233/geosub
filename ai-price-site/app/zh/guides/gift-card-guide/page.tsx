import type { Metadata } from "next";
import PublicGuidePage from "../../../../components/PublicGuidePage";

export const metadata: Metadata = {
  title: "礼品卡教程",
  description: "购买数字礼品卡前应核对发行地区、账号归属、币种、面值、兑换条件和退款规则。",
};

export default function GuideCategoryPage() {
  return (
    <PublicGuidePage
      eyebrow="Gift Card Guide"
      title="数字礼品卡购买前检查"
      description="礼品卡通常与地区和账号绑定。先核对兼容性，再比较面值和实际支付成本。"
      sections={[
        {
          title: "发行地区必须匹配账号",
          body: "不同国家或地区发行的 Apple、Google、Steam 等礼品卡通常不能跨区兑换。购买前确认账号地区与卡片发行地区一致。",
        },
        {
          title: "核对币种、面值和有效期",
          body: "相同数字面值可能代表不同币种。还应检查是否存在有效期、兑换上限、余额使用限制或订阅扣款限制。",
        },
        {
          title: "选择可追溯的销售渠道",
          body: "确认商家身份、交付方式、退款政策和客服渠道。对明显低于面值的报价保持谨慎，避免购买来源不明或已被使用的代码。",
        },
      ]}
      note="礼品卡政策由发行平台和销售商决定；兑换资格与退款结果以双方官方条款为准。"
    />
  );
}
