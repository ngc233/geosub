import type { PreparedSiteLocale } from "./site-locale";

export const ANALYTICS_CONSENT_COOKIE_NAME = "geosub_analytics_consent";
export const ANALYTICS_CONSENT_GRANTED = "granted";
export const ANALYTICS_CONSENT_DENIED = "denied";
export const ANALYTICS_CONSENT_CHANGE_EVENT =
  "geosub:analytics-consent-change";
export const ANALYTICS_CONSENT_OPEN_EVENT = "geosub:analytics-consent-open";

const ANALYTICS_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export type AnalyticsConsent =
  | typeof ANALYTICS_CONSENT_GRANTED
  | typeof ANALYTICS_CONSENT_DENIED;

type AnalyticsConsentCopy = {
  title: string;
  description: string;
  accept: string;
  reject: string;
  privacy: string;
  settings: string;
};

const copyByLocale: Record<PreparedSiteLocale, AnalyticsConsentCopy> = {
  zh: {
    title: "帮助改进 GeoSub",
    description:
      "经你同意后，我们会使用匿名访问与点击数据改进价格页面。拒绝不会影响网站功能。",
    accept: "允许统计",
    reject: "暂不允许",
    privacy: "隐私说明",
    settings: "统计设置",
  },
  "zh-tw": {
    title: "協助改善 GeoSub",
    description:
      "經你同意後，我們會使用匿名造訪與點擊資料改善價格頁面。拒絕不會影響網站功能。",
    accept: "允許統計",
    reject: "暫不允許",
    privacy: "隱私說明",
    settings: "統計設定",
  },
  en: {
    title: "Help improve GeoSub",
    description:
      "With your permission, we use anonymous visit and click data to improve pricing pages. Declining will not affect site features.",
    accept: "Allow analytics",
    reject: "Not now",
    privacy: "Privacy notice",
    settings: "Analytics settings",
  },
  ja: {
    title: "GeoSub の改善にご協力ください",
    description:
      "同意いただいた場合に限り、匿名の閲覧・クリックデータを料金ページの改善に利用します。拒否してもサイトの機能には影響しません。",
    accept: "分析を許可",
    reject: "許可しない",
    privacy: "プライバシーについて",
    settings: "分析の設定",
  },
  ko: {
    title: "GeoSub 개선에 동의해 주세요",
    description:
      "동의한 경우에만 익명 방문 및 클릭 데이터를 가격 페이지 개선에 사용합니다. 거부해도 사이트 기능에는 영향이 없습니다.",
    accept: "분석 허용",
    reject: "허용하지 않음",
    privacy: "개인정보 안내",
    settings: "분석 설정",
  },
  es: {
    title: "Ayúdanos a mejorar GeoSub",
    description:
      "Con tu permiso, usamos datos anónimos de visitas y clics para mejorar las páginas de precios. Rechazarlo no limita las funciones del sitio.",
    accept: "Permitir analítica",
    reject: "Ahora no",
    privacy: "Aviso de privacidad",
    settings: "Ajustes de analítica",
  },
  tr: {
    title: "GeoSub'ı geliştirmemize yardımcı olun",
    description:
      "İzninizle, fiyat sayfalarını geliştirmek için anonim ziyaret ve tıklama verilerini kullanırız. Reddetmeniz site işlevlerini etkilemez.",
    accept: "Analize izin ver",
    reject: "Şimdi değil",
    privacy: "Gizlilik bildirimi",
    settings: "Analiz ayarları",
  },
  ar: {
    title: "ساعدنا في تحسين GeoSub",
    description:
      "بعد موافقتك فقط، نستخدم بيانات مجهولة عن الزيارات والنقرات لتحسين صفحات الأسعار. لن يؤثر الرفض في وظائف الموقع.",
    accept: "السماح بالتحليلات",
    reject: "ليس الآن",
    privacy: "إشعار الخصوصية",
    settings: "إعدادات التحليلات",
  },
  fr: {
    title: "Aidez-nous à améliorer GeoSub",
    description:
      "Avec votre accord, nous utilisons des données anonymes de visite et de clic pour améliorer les pages de prix. Le refus ne limite aucune fonctionnalité.",
    accept: "Autoriser les statistiques",
    reject: "Pas maintenant",
    privacy: "Avis de confidentialité",
    settings: "Réglages des statistiques",
  },
  it: {
    title: "Aiutaci a migliorare GeoSub",
    description:
      "Con il tuo consenso, utilizziamo dati anonimi su visite e clic per migliorare le pagine dei prezzi. Il rifiuto non limita le funzioni del sito.",
    accept: "Consenti analisi",
    reject: "Non ora",
    privacy: "Informativa sulla privacy",
    settings: "Impostazioni analisi",
  },
  de: {
    title: "Helfen Sie uns, GeoSub zu verbessern",
    description:
      "Mit Ihrer Zustimmung nutzen wir anonyme Besuchs- und Klickdaten, um die Preisseiten zu verbessern. Eine Ablehnung schränkt die Website nicht ein.",
    accept: "Analyse erlauben",
    reject: "Jetzt nicht",
    privacy: "Datenschutzhinweis",
    settings: "Analyse-Einstellungen",
  },
  pt: {
    title: "Ajude-nos a melhorar o GeoSub",
    description:
      "Com a sua autorização, usamos dados anónimos de visitas e cliques para melhorar as páginas de preços. Recusar não limita as funções do site.",
    accept: "Permitir análise",
    reject: "Agora não",
    privacy: "Aviso de privacidade",
    settings: "Definições de análise",
  },
};

export function getAnalyticsConsentCopy(locale: PreparedSiteLocale) {
  return copyByLocale[locale];
}

export function readAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${ANALYTICS_CONSENT_COOKIE_NAME}=`;
  const value = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);

  return value === ANALYTICS_CONSENT_GRANTED ||
    value === ANALYTICS_CONSENT_DENIED
    ? value
    : null;
}

export function hasAnalyticsConsent() {
  return readAnalyticsConsent() === ANALYTICS_CONSENT_GRANTED;
}

export function setAnalyticsConsent(consent: AnalyticsConsent) {
  if (typeof document === "undefined") {
    return;
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ANALYTICS_CONSENT_COOKIE_NAME}=${consent}; Path=/; Max-Age=${ANALYTICS_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  window.dispatchEvent(
    new CustomEvent(ANALYTICS_CONSENT_CHANGE_EVENT, {
      detail: consent,
    }),
  );
}

export function openAnalyticsConsentPreferences() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ANALYTICS_CONSENT_OPEN_EVENT));
  }
}

export function clearAnalyticsCookie() {
  if (typeof document === "undefined") {
    return;
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `geosub_anon_id=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
