import AuxiliaryArticle from "../../../components/AuxiliaryArticle";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "服务条款",
  description: "本页面说明用户访问和使用 GeoSub 时需要了解的基础规则、信息边界和免责声明。",
};

export default function TrustPage() {
  return (
    <AuxiliaryArticle>
      <section>
        <p className="gs-aux-eyebrow">
          Terms of Service
        </p>

        <h1>
          服务条款
        </h1>

        <p>
          本页面说明用户访问和使用 GeoSub 时需要了解的基础规则、信息边界和免责声明。
        </p>

        <div className="gs-aux-note">
          <h2>
            页面说明
          </h2>

          <p>
            GeoSub 提供的是公开价格数据整理、地区价格比较和订阅信息参考，不构成购买建议、法律建议或财务建议。具体价格、可用性、税费和订阅政策请以官方平台为准。
          </p>

          <p>
            使用 GeoSub 即表示你理解这些数据是公开价格参考。跨区订阅、账号地区、支付方式、税费和平台风控可能影响最终是否可订阅，最终请以官方结算页和平台规则为准。
          </p>
        </div>
      </section>
    </AuxiliaryArticle>
  );
}
