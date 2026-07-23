import type { Metadata } from "next";
import PublicGuidePage from "../../../../components/PublicGuidePage";

export const metadata: Metadata = {
  title: "价格指南",
  description: "学习如何结合本地标价、显示币种、汇率日期、税费和账号限制阅读地区订阅价格。",
};

export default function GuideCategoryPage() {
  return (
    <PublicGuidePage
      eyebrow="Price Guide"
      title="如何阅读地区价格"
      description="低价排名只是起点。把本地标价、换算日期、税费和订阅资格放在一起，才能判断真实成本。"
      sections={[
        {
          title: "先看本地标价和采集日期",
          body: "本地标价是平台在该地区展示的原始价格。先确认套餐名称、月付或年付周期以及采集日期，避免比较不同套餐或不同时间的记录。",
        },
        {
          title: "再看显示币种和汇率日期",
          body: "换算价格用于横向比较，不等于信用卡最终扣款。汇率变化会改变换算结果，但不会改变平台的本地标价。",
        },
        {
          title: "最后核对税费和购买条件",
          body: "税费、账号地区、付款方式和账单地址都可能影响结算。价格较低不代表该地区一定可供你的账号购买。",
        },
      ]}
      note="GeoSub 用美国价格作为常见比较基准，但购买前仍应以对应地区的官方结算页为准。"
    />
  );
}
