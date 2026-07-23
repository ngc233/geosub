import type { Metadata } from "next";
import PublicGuidePage from "../../../../components/PublicGuidePage";

export const metadata: Metadata = {
  title: "工具测评",
  description: "从实际用途、能力边界、总成本、地区可用性和更新证据判断数字工具是否适合自己。",
};

export default function GuideCategoryPage() {
  return (
    <PublicGuidePage
      eyebrow="Tool Review"
      title="怎样判断一个数字工具是否值得订阅"
      description="不要只看功能清单或单次跑分。先明确使用场景，再比较能力、限制和持续成本。"
      sections={[
        {
          title: "从自己的任务出发",
          body: "先列出高频任务、必须具备的能力和不能接受的限制。对话、编程、图像、搜索和协作工具的评价维度并不相同。",
        },
        {
          title: "比较完整成本而非最低标价",
          body: "同时考虑订阅周期、额度、附加功能、税费、换汇成本和所在地区可用性。更便宜的套餐未必覆盖真正需要的功能。",
        },
        {
          title: "检查证据日期与产品变化",
          body: "模型能力、套餐权益和价格都会更新。阅读测评时确认测试版本、日期、方法和可复现依据，避免把旧结论当成现状。",
        },
      ]}
      note="最可靠的选择来自真实任务试用。评分和价格比较用于缩小范围，不应替代你的实际体验。"
    />
  );
}
