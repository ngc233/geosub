"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDefaultNavigationItems } from "../lib/navigation-defaults";
import { shouldHideFromPublicNavigation } from "../lib/public-launch-routes";
import type { SiteNavigationItem } from "../lib/site-navigation";
import {
  getSiteLocaleFromPath,
  stripSiteLocale,
  withSiteLocale,
  type PreparedSiteLocale,
  type SiteLocale,
} from "../lib/site-locale";
import { withTraditionalChinese } from "../lib/traditional-chinese";

const footerCopy: Record<
  PreparedSiteLocale,
  { description: string; rights: string; note: string; tagline: string }
> = withTraditionalChinese({
  zh: {
    description:
      "GeoSub 是全球数字订阅价格数据平台，当前优先整理 AI 订阅和流媒体订阅在不同国家与地区的价格差异。",
    rights: "保留所有权利。",
    note: "价格与可用性可能随地区、汇率、税费和平台政策变化，请以官方结算页为准。",
    tagline: "全球数字订阅价格数据",
  },
  en: {
    description:
      "GeoSub is a global digital subscription pricing platform. The current beta focuses on AI and streaming subscription prices across countries and regions.",
    rights: "All rights reserved.",
    note: "Prices and availability may change by region, exchange rate, tax, and platform policy. Always verify final prices on the official checkout page.",
    tagline: "Global Digital Subscription Pricing",
  },
  ja: {
    description:
      "GeoSub は、AI やストリーミングなどのデジタルサブスクリプション料金を国・地域別に比較できるデータプラットフォームです。",
    rights: "無断転載を禁じます。",
    note:
      "料金や提供状況は、地域、為替、税金、プラットフォームの方針によって変わる場合があります。最終的な料金は公式の決済画面でご確認ください。",
    tagline: "世界のデジタルサブスクリプション料金",
  },
  ko: {
    description:
      "GeoSub는 AI와 스트리밍 등 디지털 구독 서비스의 국가·지역별 가격을 비교하는 데이터 플랫폼입니다.",
    rights: "모든 권리 보유.",
    note:
      "가격과 이용 가능 여부는 지역, 환율, 세금 및 플랫폼 정책에 따라 달라질 수 있습니다. 최종 결제 금액은 공식 결제 화면에서 확인하세요.",
    tagline: "글로벌 디지털 구독 가격 데이터",
  },
  es: {
    description:
      "GeoSub es una plataforma de datos para comparar el precio de suscripciones digitales, como IA y streaming, entre países y regiones.",
    rights: "Todos los derechos reservados.",
    note:
      "Los precios y la disponibilidad pueden variar según la región, el tipo de cambio, los impuestos y las políticas de la plataforma. Comprueba siempre el importe final en la página oficial de pago.",
    tagline: "Precios globales de suscripciones digitales",
  },
  tr: {
    description:
      "GeoSub; yapay zekâ, dijital yayın ve diğer abonelik hizmetlerinin ülke ve bölgelere göre fiyatlarını karşılaştıran bir veri platformudur.",
    rights: "Tüm hakları saklıdır.",
    note:
      "Fiyatlar ve kullanılabilirlik; bölgeye, döviz kuruna, vergilere ve platform politikalarına göre değişebilir. Son tutarı her zaman resmî ödeme sayfasından doğrulayın.",
    tagline: "Dünya genelinde dijital abonelik fiyatları",
  },
  ar: {
    description:
      "GeoSub منصة بيانات لمقارنة أسعار الاشتراكات الرقمية، مثل خدمات الذكاء الاصطناعي والبث، بين الدول والمناطق.",
    rights: "جميع الحقوق محفوظة.",
    note:
      "قد تختلف الأسعار والتوافر حسب المنطقة وسعر الصرف والضرائب وسياسات المنصة. تحقّق دائمًا من السعر النهائي في صفحة الدفع الرسمية.",
    tagline: "بيانات أسعار الاشتراكات الرقمية عالميًا",
  },
  fr: {
    description: "GeoSub compare les prix des abonnements numériques, notamment les services d’IA et de streaming, entre les pays et les régions.",
    rights: "Tous droits réservés.",
    note: "Les prix et la disponibilité peuvent varier selon la région, le taux de change, les taxes et les règles de la plateforme. Vérifiez toujours le montant final sur la page de paiement officielle.",
    tagline: "Prix des abonnements numériques dans le monde",
  },
  it: {
    description: "GeoSub confronta i prezzi degli abbonamenti digitali, inclusi i servizi IA e streaming, tra paesi e regioni.",
    rights: "Tutti i diritti riservati.",
    note: "Prezzi e disponibilità possono variare in base a regione, cambio, imposte e regole della piattaforma. Verifica sempre l’importo finale nella pagina di pagamento ufficiale.",
    tagline: "Prezzi degli abbonamenti digitali nel mondo",
  },
  de: {
    description: "GeoSub vergleicht die Preise digitaler Abonnements, darunter KI- und Streaming-Dienste, nach Ländern und Regionen.",
    rights: "Alle Rechte vorbehalten.",
    note: "Preise und Verfügbarkeit können je nach Region, Wechselkurs, Steuern und Plattformregeln variieren. Prüfen Sie den Endbetrag immer auf der offiziellen Zahlungsseite.",
    tagline: "Digitale Abonnementpreise weltweit",
  },
  pt: {
    description: "O GeoSub compara os preços de assinaturas digitais, incluindo serviços de IA e streaming, entre países e regiões.",
    rights: "Todos os direitos reservados.",
    note: "Os preços e a disponibilidade podem variar conforme a região, o câmbio, os impostos e as regras da plataforma. Confirme sempre o valor final na página oficial de pagamento.",
    tagline: "Preços de assinaturas digitais no mundo",
  },
});

function shouldHideHref(href: string) {
  return shouldHideFromPublicNavigation(stripSiteLocale(href));
}

function toSiteNavigationItems(locale: SiteLocale): SiteNavigationItem[] {
  return getDefaultNavigationItems({
    locale,
    position: "footer",
  }).map((group) => ({
    name: group.label,
    href: group.href,
    children: group.children?.map((child) => ({
      name: child.label,
      href: child.href,
    })),
  }));
}

function filterFooterItems(items: SiteNavigationItem[]) {
  return items
    .filter((group) => !shouldHideHref(group.href))
    .map((group) => ({
      ...group,
      children: group.children?.filter((child) => !shouldHideHref(child.href)),
    }))
    .filter((group) => group.href || (group.children && group.children.length > 0));
}

export default function Footer({
  navItemsByLocale = {},
}: {
  navItemsByLocale?: Partial<Record<SiteLocale, SiteNavigationItem[]>>;
}) {
  const pathname = usePathname();
  const currentLocale = getSiteLocaleFromPath(pathname);
  const localeNavItems = navItemsByLocale[currentLocale] || [];
  const footerItems = filterFooterItems(
    localeNavItems.length > 0
      ? localeNavItems
      : toSiteNavigationItems(currentLocale),
  );
  const currentYear = new Date().getFullYear();
  const copy = footerCopy[currentLocale];

  return (
    <footer className="mt-auto border-t border-zinc-200 bg-white/80 dark:border-zinc-900 dark:bg-zinc-950/90">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_2fr]">
          <div>
            <Link
              href={withSiteLocale("/", currentLocale)}
              className="inline-flex items-center gap-2 text-zinc-950 transition hover:text-lime-700 dark:text-white dark:hover:text-lime-300"
              aria-label="GeoSub"
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-black text-white shadow-sm shadow-zinc-950/20 dark:bg-white dark:text-zinc-950">
                G
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-lime-500 dark:border-zinc-950" />
              </span>
              <span className="text-xl font-black tracking-tight">GeoSub</span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-7 text-zinc-500 dark:text-zinc-400">
              {copy.description}
            </p>

            <p className="mt-6 text-xs font-medium text-zinc-400 dark:text-zinc-500">
              © {currentYear} GeoSub. {copy.rights}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {footerItems.map((group) => {
              const children = group.children || [];

              return (
                <div key={`${group.name}-${group.href}`}>
                  <Link
                    href={
                      group.external
                        ? group.href
                        : withSiteLocale(group.href, currentLocale)
                    }
                    className="text-sm font-black text-zinc-950 transition hover:text-lime-700 dark:text-white dark:hover:text-lime-300"
                  >
                    {group.name}
                  </Link>

                  {children.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {children.map((item) => (
                        <Link
                          key={`${group.name}-${item.name}-${item.href}`}
                          href={
                            item.external
                              ? item.href
                              : withSiteLocale(item.href, currentLocale)
                          }
                          className="block text-sm font-medium text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-zinc-100 pt-6 text-xs text-zinc-400 dark:border-zinc-900 dark:text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{copy.note}</p>
          <p>{copy.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
