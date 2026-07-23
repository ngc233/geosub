import type { NavigationPositionValue } from "./navigation-config";
import {
  isPreparedSiteLocale,
  type PreparedSiteLocale,
} from "./site-locale";
import { withTraditionalChinese } from "./traditional-chinese";

export type DefaultNavigationChild = {
  label: string;
  href: string;
};

export type DefaultNavigationGroup = {
  label: string;
  href: string;
  children?: DefaultNavigationChild[];
};

type DefaultNavigationMap = Record<
  PreparedSiteLocale,
  Record<NavigationPositionValue, DefaultNavigationGroup[]>
>;

export const defaultNavigationItems: DefaultNavigationMap =
  withTraditionalChinese({
  zh: {
    header: [
      { label: "首页", href: "/zh/" },
      {
        label: "数字订阅",
        href: "/zh/ai-pricing",
        children: [
          { label: "AI 订阅", href: "/zh/ai-pricing" },
          { label: "流媒体", href: "/zh/streaming-pricing" },
        ],
      },
      { label: "订阅指南", href: "/zh/guides" },
      { label: "数据来源", href: "/zh/data-sources" },
    ],
    footer: [
      {
        label: "价格数据",
        href: "/zh/ai-pricing",
        children: [
          { label: "AI 订阅价格", href: "/zh/ai-pricing" },
          { label: "流媒体价格", href: "/zh/streaming-pricing" },
        ],
      },
      {
        label: "指南",
        href: "/zh/guides",
        children: [
          { label: "全部指南", href: "/zh/guides" },
          { label: "价格指南", href: "/zh/guides/price-guide" },
          { label: "支付与账号", href: "/zh/guides/payment-account" },
          { label: "方法论", href: "/zh/guides/methodology" },
        ],
      },
      {
        label: "站点",
        href: "/zh/about",
        children: [
          { label: "关于 GeoSub", href: "/zh/about" },
          { label: "数据来源", href: "/zh/data-sources" },
          { label: "联系我们", href: "/zh/contact" },
        ],
      },
      {
        label: "政策",
        href: "/zh/privacy",
        children: [
          { label: "隐私政策", href: "/zh/privacy" },
          { label: "服务条款", href: "/zh/terms" },
        ],
      },
    ],
  },
  en: {
    header: [
      { label: "Home", href: "/en/" },
      {
        label: "Digital Subscriptions",
        href: "/en/ai-pricing",
        children: [
          { label: "AI Subscriptions", href: "/en/ai-pricing" },
          { label: "Streaming", href: "/en/streaming-pricing" },
        ],
      },
      { label: "Guides", href: "/en/guides" },
      { label: "Data Sources", href: "/en/data-sources" },
    ],
    footer: [
      {
        label: "Pricing Data",
        href: "/en/ai-pricing",
        children: [
          { label: "AI Pricing", href: "/en/ai-pricing" },
          { label: "Streaming Pricing", href: "/en/streaming-pricing" },
        ],
      },
      {
        label: "Guides",
        href: "/en/guides",
        children: [
          { label: "All Guides", href: "/en/guides" },
          { label: "Price Guide", href: "/en/guides/price-guide" },
          { label: "Payment & Account", href: "/en/guides/payment-account" },
          { label: "Methodology", href: "/en/guides/methodology" },
        ],
      },
      {
        label: "Site",
        href: "/en/about",
        children: [
          { label: "About GeoSub", href: "/en/about" },
          { label: "Data Sources", href: "/en/data-sources" },
        ],
      },
      {
        label: "Legal",
        href: "/en/privacy",
        children: [
          { label: "Privacy", href: "/en/privacy" },
          { label: "Terms", href: "/en/terms" },
        ],
      },
    ],
  },
  ja: {
    header: [
      { label: "ホーム", href: "/ja/" },
      {
        label: "デジタルサブスクリプション",
        href: "/ja/ai-pricing",
        children: [
          { label: "AI サブスクリプション", href: "/ja/ai-pricing" },
          { label: "ストリーミング", href: "/ja/streaming-pricing" },
        ],
      },
      { label: "ガイド", href: "/ja/guides" },
      { label: "データソース", href: "/ja/data-sources" },
    ],
    footer: [
      {
        label: "料金データ",
        href: "/ja/ai-pricing",
        children: [
          { label: "AI サブスクリプション料金", href: "/ja/ai-pricing" },
          { label: "ストリーミング料金", href: "/ja/streaming-pricing" },
        ],
      },
      {
        label: "ガイド",
        href: "/ja/guides",
        children: [
          { label: "すべてのガイド", href: "/ja/guides" },
          { label: "料金ガイド", href: "/ja/guides/price-guide" },
          { label: "支払いとアカウント", href: "/ja/guides/payment-account" },
          { label: "調査方法", href: "/ja/guides/methodology" },
        ],
      },
      {
        label: "GeoSub",
        href: "/ja/about",
        children: [
          { label: "GeoSub について", href: "/ja/about" },
          { label: "データソース", href: "/ja/data-sources" },
        ],
      },
      {
        label: "ポリシー",
        href: "/ja/privacy",
        children: [
          { label: "プライバシーポリシー", href: "/ja/privacy" },
          { label: "利用規約", href: "/ja/terms" },
        ],
      },
    ],
  },
  ko: {
    header: [
      { label: "홈", href: "/ko/" },
      {
        label: "디지털 구독",
        href: "/ko/ai-pricing",
        children: [
          { label: "AI 구독", href: "/ko/ai-pricing" },
          { label: "스트리밍", href: "/ko/streaming-pricing" },
        ],
      },
      { label: "가이드", href: "/ko/guides" },
      { label: "데이터 출처", href: "/ko/data-sources" },
    ],
    footer: [
      {
        label: "가격 데이터",
        href: "/ko/ai-pricing",
        children: [
          { label: "AI 구독 가격", href: "/ko/ai-pricing" },
          { label: "스트리밍 가격", href: "/ko/streaming-pricing" },
        ],
      },
      {
        label: "가이드",
        href: "/ko/guides",
        children: [
          { label: "전체 가이드", href: "/ko/guides" },
          { label: "가격 가이드", href: "/ko/guides/price-guide" },
          { label: "결제 및 계정", href: "/ko/guides/payment-account" },
          { label: "조사 방법", href: "/ko/guides/methodology" },
        ],
      },
      {
        label: "GeoSub",
        href: "/ko/about",
        children: [
          { label: "GeoSub 소개", href: "/ko/about" },
          { label: "데이터 출처", href: "/ko/data-sources" },
        ],
      },
      {
        label: "정책",
        href: "/ko/privacy",
        children: [
          { label: "개인정보 처리방침", href: "/ko/privacy" },
          { label: "이용약관", href: "/ko/terms" },
        ],
      },
    ],
  },
  es: {
    header: [
      { label: "Inicio", href: "/es/" },
      {
        label: "Suscripciones digitales",
        href: "/es/ai-pricing",
        children: [
          { label: "Suscripciones de IA", href: "/es/ai-pricing" },
          { label: "Streaming", href: "/es/streaming-pricing" },
        ],
      },
      { label: "Guías", href: "/es/guides" },
      { label: "Fuentes de datos", href: "/es/data-sources" },
    ],
    footer: [
      {
        label: "Datos de precios",
        href: "/es/ai-pricing",
        children: [
          { label: "Precios de IA", href: "/es/ai-pricing" },
          { label: "Precios de streaming", href: "/es/streaming-pricing" },
        ],
      },
      {
        label: "Guías",
        href: "/es/guides",
        children: [
          { label: "Todas las guías", href: "/es/guides" },
          { label: "Guía de precios", href: "/es/guides/price-guide" },
          { label: "Pagos y cuentas", href: "/es/guides/payment-account" },
          { label: "Metodología", href: "/es/guides/methodology" },
        ],
      },
      {
        label: "GeoSub",
        href: "/es/about",
        children: [
          { label: "Acerca de GeoSub", href: "/es/about" },
          { label: "Fuentes de datos", href: "/es/data-sources" },
        ],
      },
      {
        label: "Legal",
        href: "/es/privacy",
        children: [
          { label: "Privacidad", href: "/es/privacy" },
          { label: "Términos de uso", href: "/es/terms" },
        ],
      },
    ],
  },
  tr: {
    header: [
      { label: "Ana Sayfa", href: "/tr/" },
      {
        label: "Dijital Abonelikler",
        href: "/tr/ai-pricing",
        children: [
          { label: "Yapay Zekâ Abonelikleri", href: "/tr/ai-pricing" },
          { label: "Dijital Yayın", href: "/tr/streaming-pricing" },
        ],
      },
      { label: "Rehberler", href: "/tr/guides" },
      { label: "Veri Kaynakları", href: "/tr/data-sources" },
    ],
    footer: [
      {
        label: "Fiyat Verileri",
        href: "/tr/ai-pricing",
        children: [
          { label: "Yapay Zekâ Abonelik Fiyatları", href: "/tr/ai-pricing" },
          { label: "Dijital Yayın Fiyatları", href: "/tr/streaming-pricing" },
        ],
      },
      {
        label: "Rehberler",
        href: "/tr/guides",
        children: [
          { label: "Tüm Rehberler", href: "/tr/guides" },
          { label: "Fiyat Rehberi", href: "/tr/guides/price-guide" },
          { label: "Ödeme ve Hesap", href: "/tr/guides/payment-account" },
          { label: "Yöntem", href: "/tr/guides/methodology" },
        ],
      },
      {
        label: "GeoSub",
        href: "/tr/about",
        children: [
          { label: "GeoSub Hakkında", href: "/tr/about" },
          { label: "Veri Kaynakları", href: "/tr/data-sources" },
        ],
      },
      {
        label: "Yasal",
        href: "/tr/privacy",
        children: [
          { label: "Gizlilik Politikası", href: "/tr/privacy" },
          { label: "Kullanım Koşulları", href: "/tr/terms" },
        ],
      },
    ],
  },
  ar: {
    header: [
      { label: "الرئيسية", href: "/ar/" },
      {
        label: "الاشتراكات الرقمية",
        href: "/ar/ai-pricing",
        children: [
          { label: "اشتراكات الذكاء الاصطناعي", href: "/ar/ai-pricing" },
          { label: "خدمات البث", href: "/ar/streaming-pricing" },
        ],
      },
      { label: "الأدلة", href: "/ar/guides" },
      { label: "مصادر البيانات", href: "/ar/data-sources" },
    ],
    footer: [
      {
        label: "بيانات الأسعار",
        href: "/ar/ai-pricing",
        children: [
          { label: "أسعار اشتراكات الذكاء الاصطناعي", href: "/ar/ai-pricing" },
          { label: "أسعار خدمات البث", href: "/ar/streaming-pricing" },
        ],
      },
      {
        label: "الأدلة",
        href: "/ar/guides",
        children: [
          { label: "جميع الأدلة", href: "/ar/guides" },
          { label: "دليل الأسعار", href: "/ar/guides/price-guide" },
          { label: "الدفع والحسابات", href: "/ar/guides/payment-account" },
          { label: "المنهجية", href: "/ar/guides/methodology" },
        ],
      },
      {
        label: "GeoSub",
        href: "/ar/about",
        children: [
          { label: "عن GeoSub", href: "/ar/about" },
          { label: "مصادر البيانات", href: "/ar/data-sources" },
        ],
      },
      {
        label: "السياسات",
        href: "/ar/privacy",
        children: [
          { label: "سياسة الخصوصية", href: "/ar/privacy" },
          { label: "شروط الاستخدام", href: "/ar/terms" },
        ],
      },
    ],
  },
  fr: {
    header: [
      { label: "Accueil", href: "/fr/" },
      { label: "Abonnements numériques", href: "/fr/ai-pricing", children: [
        { label: "Abonnements IA", href: "/fr/ai-pricing" },
        { label: "Streaming", href: "/fr/streaming-pricing" },
      ] },
      { label: "Guides", href: "/fr/guides" },
      { label: "Sources des données", href: "/fr/data-sources" },
    ],
    footer: [
      { label: "Données tarifaires", href: "/fr/ai-pricing", children: [
        { label: "Prix des abonnements IA", href: "/fr/ai-pricing" },
        { label: "Prix du streaming", href: "/fr/streaming-pricing" },
      ] },
      { label: "Guides", href: "/fr/guides", children: [
        { label: "Tous les guides", href: "/fr/guides" },
        { label: "Guide des prix", href: "/fr/guides/price-guide" },
        { label: "Paiement et compte", href: "/fr/guides/payment-account" },
        { label: "Méthodologie", href: "/fr/guides/methodology" },
      ] },
      { label: "GeoSub", href: "/fr/about", children: [
        { label: "À propos de GeoSub", href: "/fr/about" },
        { label: "Sources des données", href: "/fr/data-sources" },
      ] },
      { label: "Informations légales", href: "/fr/privacy", children: [
        { label: "Confidentialité", href: "/fr/privacy" },
        { label: "Conditions d’utilisation", href: "/fr/terms" },
      ] },
    ],
  },
  it: {
    header: [
      { label: "Home", href: "/it/" },
      { label: "Abbonamenti digitali", href: "/it/ai-pricing", children: [
        { label: "Abbonamenti IA", href: "/it/ai-pricing" },
        { label: "Streaming", href: "/it/streaming-pricing" },
      ] },
      { label: "Guide", href: "/it/guides" },
      { label: "Fonti dei dati", href: "/it/data-sources" },
    ],
    footer: [
      { label: "Dati sui prezzi", href: "/it/ai-pricing", children: [
        { label: "Prezzi degli abbonamenti IA", href: "/it/ai-pricing" },
        { label: "Prezzi dello streaming", href: "/it/streaming-pricing" },
      ] },
      { label: "Guide", href: "/it/guides", children: [
        { label: "Tutte le guide", href: "/it/guides" },
        { label: "Guida ai prezzi", href: "/it/guides/price-guide" },
        { label: "Pagamenti e account", href: "/it/guides/payment-account" },
        { label: "Metodologia", href: "/it/guides/methodology" },
      ] },
      { label: "GeoSub", href: "/it/about", children: [
        { label: "Informazioni su GeoSub", href: "/it/about" },
        { label: "Fonti dei dati", href: "/it/data-sources" },
      ] },
      { label: "Note legali", href: "/it/privacy", children: [
        { label: "Privacy", href: "/it/privacy" },
        { label: "Termini di utilizzo", href: "/it/terms" },
      ] },
    ],
  },
  de: {
    header: [
      { label: "Startseite", href: "/de/" },
      { label: "Digitale Abonnements", href: "/de/ai-pricing", children: [
        { label: "KI-Abonnements", href: "/de/ai-pricing" },
        { label: "Streaming", href: "/de/streaming-pricing" },
      ] },
      { label: "Ratgeber", href: "/de/guides" },
      { label: "Datenquellen", href: "/de/data-sources" },
    ],
    footer: [
      { label: "Preisdaten", href: "/de/ai-pricing", children: [
        { label: "Preise für KI-Abonnements", href: "/de/ai-pricing" },
        { label: "Streaming-Preise", href: "/de/streaming-pricing" },
      ] },
      { label: "Ratgeber", href: "/de/guides", children: [
        { label: "Alle Ratgeber", href: "/de/guides" },
        { label: "Preisratgeber", href: "/de/guides/price-guide" },
        { label: "Zahlung und Konto", href: "/de/guides/payment-account" },
        { label: "Methodik", href: "/de/guides/methodology" },
      ] },
      { label: "GeoSub", href: "/de/about", children: [
        { label: "Über GeoSub", href: "/de/about" },
        { label: "Datenquellen", href: "/de/data-sources" },
      ] },
      { label: "Rechtliches", href: "/de/privacy", children: [
        { label: "Datenschutz", href: "/de/privacy" },
        { label: "Nutzungsbedingungen", href: "/de/terms" },
      ] },
    ],
  },
  pt: {
    header: [
      { label: "Início", href: "/pt/" },
      { label: "Assinaturas digitais", href: "/pt/ai-pricing", children: [
        { label: "Assinaturas de IA", href: "/pt/ai-pricing" },
        { label: "Streaming", href: "/pt/streaming-pricing" },
      ] },
      { label: "Guias", href: "/pt/guides" },
      { label: "Fontes de dados", href: "/pt/data-sources" },
    ],
    footer: [
      { label: "Dados de preços", href: "/pt/ai-pricing", children: [
        { label: "Preços de assinaturas de IA", href: "/pt/ai-pricing" },
        { label: "Preços de streaming", href: "/pt/streaming-pricing" },
      ] },
      { label: "Guias", href: "/pt/guides", children: [
        { label: "Todos os guias", href: "/pt/guides" },
        { label: "Guia de preços", href: "/pt/guides/price-guide" },
        { label: "Pagamentos e conta", href: "/pt/guides/payment-account" },
        { label: "Metodologia", href: "/pt/guides/methodology" },
      ] },
      { label: "GeoSub", href: "/pt/about", children: [
        { label: "Sobre o GeoSub", href: "/pt/about" },
        { label: "Fontes de dados", href: "/pt/data-sources" },
      ] },
      { label: "Informação legal", href: "/pt/privacy", children: [
        { label: "Privacidade", href: "/pt/privacy" },
        { label: "Termos de utilização", href: "/pt/terms" },
      ] },
    ],
  },
  });

export function getDefaultNavigationItems({
  locale,
  position,
}: {
  locale: string;
  position: NavigationPositionValue;
}) {
  const normalizedLocale = isPreparedSiteLocale(locale) ? locale : "zh";
  return defaultNavigationItems[normalizedLocale][position];
}
