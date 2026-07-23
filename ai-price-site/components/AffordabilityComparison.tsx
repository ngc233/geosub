"use client";

import { useMemo, useState } from "react";
import type {
  PlanAffordabilityRow,
  PlanAffordabilitySummary,
} from "../lib/affordability";
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  formatLocalizedPercent,
  getLocalizedRegionName,
} from "../lib/locale-format";
import type { PreparedSiteLocale } from "../lib/site-locale";
import { withTraditionalChinese } from "../lib/traditional-chinese";
import ExpandableAffordabilityRows from "./ExpandableAffordabilityRows";
import {
  DataNote,
  PublicSection,
  PublicSectionHeader,
} from "./ui/PublicPage";

type Props = {
  productName: string;
  planName: string;
  summary: PlanAffordabilitySummary | null;
  rows: PlanAffordabilityRow[];
  locale?: PreparedSiteLocale;
};

type SortMode = "pressure" | "accessible";

type AffordabilityCopy = {
  times: string;
  sectionTitle: (productName: string) => string;
  sectionDescription: (planName: string) => string;
  highestBurden: string;
  lowestBurden: string;
  usBase: string;
  highestBurdenHelper: (share: string, times: string) => string;
  lowestBurdenHelper: (share: string, times: string) => string;
  usBaseHelper: (share: string) => string;
  chartTitle: string;
  chartDescription: string;
  pressureFirst: string;
  accessibleFirst: string;
  rank: string;
  region: string;
  monthlyFee: string;
  burden: string;
  usBenchmark: string;
  incomeShare: (share: string) => string;
  monthlyIncome: (income: string) => string;
  priceCheaper: (value: number) => string;
  priceHigher: (value: number) => string;
  priceSame: string;
  relativeBurden: (value: string) => string;
  bands: {
    lighter: string;
    similar: string;
    elevated: string;
    heavy: string;
    severe: string;
  };
  methodLabel: string;
  method: string;
  dataNote: (
    metric: string,
    indicator: string,
    year: string,
    checked: string,
  ) => string;
  showMore: (count: number) => string;
  collapse: string;
};

const affordabilityCopy = withTraditionalChinese({
  zh: {
    times: "倍",
    sectionTitle: (productName: string) => `${productName} 本地购买力对比`,
    sectionDescription: (planName: string) =>
      `把 ${planName} 的月费与当地月均收入放在一起比较，判断同一笔订阅在不同地区实际有多重。`,
    highestBurden: "最难承受",
    lowestBurden: "最易承受",
    usBase: "美国基准",
    highestBurdenHelper: (share: string, times: string) =>
      `占月收入 ${share} · 美国的 ${times} 倍`,
    lowestBurdenHelper: (share: string, times: string) =>
      `占月收入 ${share} · 美国的 ${times} 倍`,
    usBaseHelper: (share: string) => `占月收入 ${share} · 记为 1.00 倍`,
    chartTitle: "本地订阅负担排行",
    chartDescription: "数值越高，代表这笔月费占当地收入越多。条形中的细线是美国 1.00 倍基准。",
    pressureFirst: "最难承受",
    accessibleFirst: "最易承受",
    rank: "排名",
    region: "地区",
    monthlyFee: "月费",
    burden: "本地负担",
    usBenchmark: "美国 1.00 倍",
    incomeShare: (share: string) => `占月收入 ${share}`,
    monthlyIncome: (income: string) => `月均收入约 ${income}`,
    priceCheaper: (value: number) => `比美国便宜 ${Math.abs(Math.round(value))}%`,
    priceHigher: (value: number) => `比美国贵 ${Math.abs(Math.round(value))}%`,
    priceSame: "与美国价格接近",
    relativeBurden: (value: string) => `美国的 ${value} 倍`,
    bands: {
      lighter: "比美国负担轻",
      similar: "接近美国",
      elevated: "负担偏重",
      heavy: "负担较重",
      severe: "负担很重",
    },
    methodLabel: "怎么算",
    method: "月费 ÷ 当地月均收入，再与美国同套餐的收入占比比较。这个指标用于比较相对压力，不代表个人实际收入或支付成功率。",
    dataNote: (metric: string, indicator: string, year: string, checked: string) =>
      `收入指标采用 ${metric}${indicator ? `（${indicator}）` : ""}，收入数据年份为 ${year}，价格检查时间为 ${checked}。购买力结果用于解释地区价格压力，不等同于个人支付能力。`,
    showMore: (count: number) => `显示更多 ${count} 个地区`,
    collapse: "收起地区列表",
  },
  en: {
    times: "×",
    sectionTitle: (productName: string) => `${productName} local affordability`,
    sectionDescription: (planName: string) =>
      `Compares the ${planName} monthly fee with estimated local monthly income to show how heavy the same subscription may feel across regions.`,
    highestBurden: "Hardest to afford",
    lowestBurden: "Easiest to afford",
    usBase: "US benchmark",
    highestBurdenHelper: (share: string, times: string) =>
      `${share} of monthly income · ${times}× the US burden`,
    lowestBurdenHelper: (share: string, times: string) =>
      `${share} of monthly income · ${times}× the US burden`,
    usBaseHelper: (share: string) => `${share} of monthly income · defined as 1.00×`,
    chartTitle: "Local subscription burden ranking",
    chartDescription: "Higher values mean the fee consumes more local income. The thin marker in each bar is the US 1.00× benchmark.",
    pressureFirst: "Hardest to afford",
    accessibleFirst: "Easiest to afford",
    rank: "Rank",
    region: "Region",
    monthlyFee: "Monthly fee",
    burden: "Local burden",
    usBenchmark: "US 1.00×",
    incomeShare: (share: string) => `${share} of monthly income`,
    monthlyIncome: (income: string) => `Estimated monthly income ${income}`,
    priceCheaper: (value: number) => `${Math.abs(Math.round(value))}% cheaper than US`,
    priceHigher: (value: number) => `${Math.abs(Math.round(value))}% higher than US`,
    priceSame: "Close to the US price",
    relativeBurden: (value: string) => `${value}× the US burden`,
    bands: {
      lighter: "Lighter than US",
      similar: "Close to US",
      elevated: "Elevated burden",
      heavy: "Heavy burden",
      severe: "Very heavy burden",
    },
    methodLabel: "Method",
    method: "Monthly fee divided by estimated local monthly income, then compared with the income share for the same plan in the US. This shows relative pressure, not personal income or payment success.",
    dataNote: (metric: string, indicator: string, year: string, checked: string) =>
      `Income metric: ${metric}${indicator ? ` (${indicator})` : ""}. Income data year: ${year}. Price checked: ${checked}. Affordability results explain regional price pressure; they do not represent an individual's ability to pay.`,
    showMore: (count: number) => `Show ${count} more regions`,
    collapse: "Show fewer regions",
  },
  ja: {
    times: "倍",
    sectionTitle: (productName: string) => `${productName} の地域別購入負担`,
    sectionDescription: (planName: string) =>
      `${planName} の月額料金を各地域の推定月収と比較し、同じサブスクリプションの負担感が地域によってどう変わるかを示します。`,
    highestBurden: "最も負担が大きい",
    lowestBurden: "最も負担が小さい",
    usBase: "米国基準",
    highestBurdenHelper: (share: string, times: string) =>
      `月収の ${share}・米国の ${times} 倍`,
    lowestBurdenHelper: (share: string, times: string) =>
      `月収の ${share}・米国の ${times} 倍`,
    usBaseHelper: (share: string) => `月収の ${share}・1.00倍を基準`,
    chartTitle: "地域別サブスクリプション負担ランキング",
    chartDescription:
      "数値が高いほど、月額料金が現地収入に占める割合が大きくなります。各バーの細線は米国の1.00倍基準です。",
    pressureFirst: "負担が大きい順",
    accessibleFirst: "負担が小さい順",
    rank: "順位",
    region: "地域",
    monthlyFee: "月額料金",
    burden: "現地負担",
    usBenchmark: "米国 1.00倍",
    incomeShare: (share: string) => `月収の ${share}`,
    monthlyIncome: (income: string) => `推定月収 ${income}`,
    priceCheaper: (value: number) => `米国より ${Math.abs(Math.round(value))}% 安い`,
    priceHigher: (value: number) => `米国より ${Math.abs(Math.round(value))}% 高い`,
    priceSame: "米国とほぼ同じ価格",
    relativeBurden: (value: string) => `米国の ${value} 倍`,
    bands: {
      lighter: "米国より負担が軽い",
      similar: "米国と同程度",
      elevated: "やや負担が重い",
      heavy: "負担が重い",
      severe: "負担が非常に重い",
    },
    methodLabel: "算出方法",
    method:
      "月額料金を現地の推定月収で割り、同じプランの米国における収入比と比較します。相対的な負担を示す指標であり、個人の実収入や決済可否を示すものではありません。",
    dataNote: (metric: string, indicator: string, year: string, checked: string) =>
      `収入指標は ${metric}${indicator ? `（${indicator}）` : ""}、収入データは ${year} 年、価格確認日は ${checked} です。結果は地域間の価格負担を説明するもので、個人の支払い能力を示すものではありません。`,
    showMore: (count: number) => `さらに ${count} 地域を表示`,
    collapse: "地域一覧を折りたたむ",
  },
  ko: {
    times: "배",
    sectionTitle: (productName: string) => `${productName} 지역별 구매 부담`,
    sectionDescription: (planName: string) =>
      `${planName} 월 요금을 각 지역의 추정 월소득과 비교해 동일한 구독이 지역마다 얼마나 부담되는지 보여 줍니다.`,
    highestBurden: "부담이 가장 큰 지역",
    lowestBurden: "부담이 가장 작은 지역",
    usBase: "미국 기준",
    highestBurdenHelper: (share: string, times: string) =>
      `월소득의 ${share} · 미국의 ${times}배`,
    lowestBurdenHelper: (share: string, times: string) =>
      `월소득의 ${share} · 미국의 ${times}배`,
    usBaseHelper: (share: string) => `월소득의 ${share} · 1.00배 기준`,
    chartTitle: "지역별 구독 부담 순위",
    chartDescription:
      "값이 높을수록 월 요금이 현지 소득에서 차지하는 비중이 큽니다. 막대 안의 가는 선은 미국 1.00배 기준입니다.",
    pressureFirst: "부담 높은 순",
    accessibleFirst: "부담 낮은 순",
    rank: "순위",
    region: "지역",
    monthlyFee: "월 요금",
    burden: "현지 부담",
    usBenchmark: "미국 1.00배",
    incomeShare: (share: string) => `월소득의 ${share}`,
    monthlyIncome: (income: string) => `추정 월소득 ${income}`,
    priceCheaper: (value: number) => `미국보다 ${Math.abs(Math.round(value))}% 저렴`,
    priceHigher: (value: number) => `미국보다 ${Math.abs(Math.round(value))}% 비쌈`,
    priceSame: "미국과 비슷한 가격",
    relativeBurden: (value: string) => `미국의 ${value}배`,
    bands: {
      lighter: "미국보다 부담 낮음",
      similar: "미국과 비슷함",
      elevated: "부담 다소 높음",
      heavy: "부담 높음",
      severe: "부담 매우 높음",
    },
    methodLabel: "계산 방법",
    method:
      "월 요금을 현지 추정 월소득으로 나눈 뒤 같은 요금제의 미국 소득 대비 비중과 비교합니다. 상대적인 부담을 보여 주는 지표이며 개인 소득이나 결제 성공 여부를 뜻하지 않습니다.",
    dataNote: (metric: string, indicator: string, year: string, checked: string) =>
      `소득 지표는 ${metric}${indicator ? ` (${indicator})` : ""}, 소득 데이터 연도는 ${year}년, 가격 확인일은 ${checked}입니다. 결과는 지역별 가격 부담을 설명하며 개인의 지불 능력을 나타내지 않습니다.`,
    showMore: (count: number) => `${count}개 지역 더 보기`,
    collapse: "지역 목록 접기",
  },
  es: {
    times: "×",
    sectionTitle: (productName: string) => `Asequibilidad local de ${productName}`,
    sectionDescription: (planName: string) =>
      `Compara la cuota mensual de ${planName} con los ingresos mensuales estimados de cada región para mostrar cuánto pesa la misma suscripción en distintos lugares.`,
    highestBurden: "Más difícil de asumir",
    lowestBurden: "Más fácil de asumir",
    usBase: "Referencia de EE. UU.",
    highestBurdenHelper: (share: string, times: string) =>
      `${share} del ingreso mensual · ${times}× la carga de EE. UU.`,
    lowestBurdenHelper: (share: string, times: string) =>
      `${share} del ingreso mensual · ${times}× la carga de EE. UU.`,
    usBaseHelper: (share: string) => `${share} del ingreso mensual · referencia 1,00×`,
    chartTitle: "Clasificación de la carga local de la suscripción",
    chartDescription:
      "Cuanto mayor es el valor, más parte de los ingresos locales consume la cuota. La línea fina de cada barra marca la referencia de EE. UU. en 1,00×.",
    pressureFirst: "Mayor carga",
    accessibleFirst: "Menor carga",
    rank: "Puesto",
    region: "Región",
    monthlyFee: "Cuota mensual",
    burden: "Carga local",
    usBenchmark: "EE. UU. 1,00×",
    incomeShare: (share: string) => `${share} del ingreso mensual`,
    monthlyIncome: (income: string) => `Ingreso mensual estimado: ${income}`,
    priceCheaper: (value: number) => `${Math.abs(Math.round(value))}% más barato que EE. UU.`,
    priceHigher: (value: number) => `${Math.abs(Math.round(value))}% más caro que EE. UU.`,
    priceSame: "Precio similar al de EE. UU.",
    relativeBurden: (value: string) => `${value}× la carga de EE. UU.`,
    bands: {
      lighter: "Menor carga que EE. UU.",
      similar: "Similar a EE. UU.",
      elevated: "Carga algo elevada",
      heavy: "Carga elevada",
      severe: "Carga muy elevada",
    },
    methodLabel: "Método",
    method:
      "Se divide la cuota mensual por los ingresos mensuales locales estimados y se compara el resultado con la proporción del mismo plan en EE. UU. Mide presión relativa, no ingresos personales ni la posibilidad de completar el pago.",
    dataNote: (metric: string, indicator: string, year: string, checked: string) =>
      `Indicador de ingresos: ${metric}${indicator ? ` (${indicator})` : ""}. Año de los datos: ${year}. Precio comprobado: ${checked}. El resultado explica la presión relativa entre regiones y no representa la capacidad de pago individual.`,
    showMore: (count: number) => `Mostrar ${count} regiones más`,
    collapse: "Mostrar menos regiones",
  },
  tr: {
    times: "kat",
    sectionTitle: (productName: string) => `${productName} yerel satın alma gücü`,
    sectionDescription: (planName: string) =>
      `${planName} aylık ücretini tahmini yerel aylık gelirle karşılaştırarak aynı aboneliğin farklı bölgelerde ne kadar yük oluşturduğunu gösterir.`,
    highestBurden: "Karşılaması en zor",
    lowestBurden: "Karşılaması en kolay",
    usBase: "ABD ölçütü",
    highestBurdenHelper: (share: string, times: string) =>
      `Aylık gelirin ${share} kadarı · ABD yükünün ${times} katı`,
    lowestBurdenHelper: (share: string, times: string) =>
      `Aylık gelirin ${share} kadarı · ABD yükünün ${times} katı`,
    usBaseHelper: (share: string) => `Aylık gelirin ${share} kadarı · 1,00 kat ölçüt`,
    chartTitle: "Yerel abonelik yükü sıralaması",
    chartDescription:
      "Değer yükseldikçe ücret yerel gelirin daha büyük bölümünü tüketir. Her çubuktaki ince çizgi ABD'nin 1,00 kat ölçütünü gösterir.",
    pressureFirst: "En yüksek yük",
    accessibleFirst: "En düşük yük",
    rank: "Sıra",
    region: "Bölge",
    monthlyFee: "Aylık ücret",
    burden: "Yerel yük",
    usBenchmark: "ABD 1,00 kat",
    incomeShare: (share: string) => `Aylık gelirin ${share} kadarı`,
    monthlyIncome: (income: string) => `Tahmini aylık gelir ${income}`,
    priceCheaper: (value: number) => `ABD'den %${Math.abs(Math.round(value))} daha ucuz`,
    priceHigher: (value: number) => `ABD'den %${Math.abs(Math.round(value))} daha pahalı`,
    priceSame: "ABD fiyatına yakın",
    relativeBurden: (value: string) => `ABD yükünün ${value} katı`,
    bands: {
      lighter: "ABD'den daha hafif",
      similar: "ABD'ye yakın",
      elevated: "Yük artmış",
      heavy: "Yüksek yük",
      severe: "Çok yüksek yük",
    },
    methodLabel: "Yöntem",
    method:
      "Aylık ücret tahmini yerel aylık gelire bölünür ve aynı paketin ABD'deki gelir payıyla karşılaştırılır. Bu, göreli baskıyı gösterir; kişisel geliri veya ödemenin tamamlanabileceğini göstermez.",
    dataNote: (metric: string, indicator: string, year: string, checked: string) =>
      `Gelir göstergesi: ${metric}${indicator ? ` (${indicator})` : ""}. Gelir verisi yılı: ${year}. Fiyat kontrolü: ${checked}. Sonuçlar bölgesel fiyat baskısını açıklar; bireysel ödeme gücünü temsil etmez.`,
    showMore: (count: number) => `${count} bölge daha göster`,
    collapse: "Daha az bölge göster",
  },
  ar: {
    times: "×",
    sectionTitle: (productName: string) => `القدرة الشرائية المحلية لاشتراك ${productName}`,
    sectionDescription: (planName: string) =>
      `تقارن الرسوم الشهرية لباقة ${planName} بالدخل الشهري المحلي التقديري لتوضيح مدى ثقل الاشتراك نفسه في المناطق المختلفة.`,
    highestBurden: "الأصعب تحملاً",
    lowestBurden: "الأسهل تحملاً",
    usBase: "المعيار الأمريكي",
    highestBurdenHelper: (share: string, times: string) =>
      `${share} من الدخل الشهري · ${times}× العبء في الولايات المتحدة`,
    lowestBurdenHelper: (share: string, times: string) =>
      `${share} من الدخل الشهري · ${times}× العبء في الولايات المتحدة`,
    usBaseHelper: (share: string) => `${share} من الدخل الشهري · معيار 1.00×`,
    chartTitle: "ترتيب عبء الاشتراك محلياً",
    chartDescription:
      "كلما ارتفعت القيمة استهلكت الرسوم حصة أكبر من الدخل المحلي. يمثل الخط الرفيع داخل كل شريط معيار الولايات المتحدة البالغ 1.00×.",
    pressureFirst: "الأعلى عبئاً",
    accessibleFirst: "الأقل عبئاً",
    rank: "الترتيب",
    region: "المنطقة",
    monthlyFee: "الرسوم الشهرية",
    burden: "العبء المحلي",
    usBenchmark: "الولايات المتحدة 1.00×",
    incomeShare: (share: string) => `${share} من الدخل الشهري`,
    monthlyIncome: (income: string) => `الدخل الشهري التقديري ${income}`,
    priceCheaper: (value: number) => `أرخص من الولايات المتحدة بنسبة ${Math.abs(Math.round(value))}%`,
    priceHigher: (value: number) => `أغلى من الولايات المتحدة بنسبة ${Math.abs(Math.round(value))}%`,
    priceSame: "قريب من السعر الأمريكي",
    relativeBurden: (value: string) => `${value}× العبء في الولايات المتحدة`,
    bands: {
      lighter: "أخف من الولايات المتحدة",
      similar: "قريب من الولايات المتحدة",
      elevated: "عبء مرتفع نسبياً",
      heavy: "عبء مرتفع",
      severe: "عبء مرتفع جداً",
    },
    methodLabel: "طريقة الحساب",
    method:
      "تُقسم الرسوم الشهرية على الدخل الشهري المحلي التقديري، ثم تُقارن بحصة الدخل للباقة نفسها في الولايات المتحدة. يقيس المؤشر الضغط النسبي ولا يمثل دخل الفرد أو نجاح عملية الدفع.",
    dataNote: (metric: string, indicator: string, year: string, checked: string) =>
      `مؤشر الدخل: ${metric}${indicator ? ` (${indicator})` : ""}. سنة بيانات الدخل: ${year}. تاريخ فحص السعر: ${checked}. تشرح النتائج ضغط الأسعار بين المناطق ولا تمثل القدرة الفردية على الدفع.`,
    showMore: (count: number) => `عرض ${count} مناطق إضافية`,
    collapse: "عرض مناطق أقل",
  },
  fr: {
    times: "×", sectionTitle: (p) => `Pouvoir d’achat local pour ${p}`,
    sectionDescription: (p) => `Le prix mensuel de l’offre ${p} est rapporté au revenu mensuel local estimé afin de mesurer son poids réel selon la région.`,
    highestBurden: "Le plus difficile à financer", lowestBurden: "Le plus accessible", usBase: "Référence américaine",
    highestBurdenHelper: (s,t) => `${s} du revenu mensuel · ${t}× la charge américaine`,
    lowestBurdenHelper: (s,t) => `${s} du revenu mensuel · ${t}× la charge américaine`,
    usBaseHelper: (s) => `${s} du revenu mensuel · référence 1,00×`,
    chartTitle: "Classement du poids local de l’abonnement",
    chartDescription: "Plus la valeur est élevée, plus l’abonnement absorbe une part importante du revenu local. Le repère dans chaque barre correspond aux États-Unis, soit 1,00×.",
    pressureFirst: "Charge la plus forte", accessibleFirst: "Le plus accessible", rank: "Rang", region: "Région",
    monthlyFee: "Prix mensuel", burden: "Charge locale", usBenchmark: "États-Unis 1,00×",
    incomeShare: (s) => `${s} du revenu mensuel`, monthlyIncome: (i) => `Revenu mensuel estimé : ${i}`,
    priceCheaper: (v) => `${Math.abs(Math.round(v))}% moins cher qu’aux États-Unis`,
    priceHigher: (v) => `${Math.abs(Math.round(v))}% plus cher qu’aux États-Unis`,
    priceSame: "Prix proche des États-Unis", relativeBurden: (v) => `${v}× la charge américaine`,
    bands: { lighter: "Moins lourd qu’aux États-Unis", similar: "Proche des États-Unis", elevated: "Charge accrue", heavy: "Charge élevée", severe: "Charge très élevée" },
    methodLabel: "Méthode", method: "Le prix mensuel est divisé par le revenu mensuel local estimé, puis comparé à la part de revenu de la même offre aux États-Unis. Cet indicateur mesure une pression relative, pas le revenu individuel ni la possibilité de payer.",
    dataNote: (m,i,y,c) => `Indicateur de revenu : ${m}${i ? ` (${i})` : ""}. Année des revenus : ${y}. Prix vérifié le : ${c}. Les résultats décrivent la pression régionale, pas la capacité de paiement individuelle.`,
    showMore: (c) => `Afficher ${c} régions supplémentaires`, collapse: "Afficher moins de régions",
  },
  it: {
    times: "×", sectionTitle: (p) => `Potere d’acquisto locale per ${p}`,
    sectionDescription: (p) => `Il costo mensile del piano ${p} viene confrontato con il reddito mensile locale stimato per mostrarne il peso reale nelle diverse regioni.`,
    highestBurden: "Più difficile da sostenere", lowestBurden: "Più accessibile", usBase: "Riferimento USA",
    highestBurdenHelper: (s,t) => `${s} del reddito mensile · ${t}× il peso negli USA`,
    lowestBurdenHelper: (s,t) => `${s} del reddito mensile · ${t}× il peso negli USA`,
    usBaseHelper: (s) => `${s} del reddito mensile · riferimento 1,00×`,
    chartTitle: "Classifica del peso locale dell’abbonamento",
    chartDescription: "Più alto è il valore, maggiore è la quota di reddito locale assorbita. Il riferimento in ogni barra rappresenta gli Stati Uniti a 1,00×.",
    pressureFirst: "Peso maggiore", accessibleFirst: "Più accessibile", rank: "Posizione", region: "Regione",
    monthlyFee: "Costo mensile", burden: "Peso locale", usBenchmark: "Stati Uniti 1,00×",
    incomeShare: (s) => `${s} del reddito mensile`, monthlyIncome: (i) => `Reddito mensile stimato: ${i}`,
    priceCheaper: (v) => `${Math.abs(Math.round(v))}% meno caro degli Stati Uniti`,
    priceHigher: (v) => `${Math.abs(Math.round(v))}% più caro degli Stati Uniti`,
    priceSame: "Prezzo vicino a quello USA", relativeBurden: (v) => `${v}× il peso negli USA`,
    bands: { lighter: "Più leggero degli USA", similar: "Simile agli USA", elevated: "Peso maggiore", heavy: "Peso elevato", severe: "Peso molto elevato" },
    methodLabel: "Metodo", method: "Il costo mensile viene diviso per il reddito mensile locale stimato e confrontato con la quota di reddito dello stesso piano negli Stati Uniti. L’indicatore misura la pressione relativa, non il reddito individuale né la possibilità di completare il pagamento.",
    dataNote: (m,i,y,c) => `Indicatore di reddito: ${m}${i ? ` (${i})` : ""}. Anno dei dati: ${y}. Prezzo verificato il: ${c}. I risultati descrivono la pressione regionale, non la capacità di pagamento individuale.`,
    showMore: (c) => `Mostra altre ${c} regioni`, collapse: "Mostra meno regioni",
  },
  de: {
    times: "×", sectionTitle: (p) => `Lokale Kaufkraft für ${p}`,
    sectionDescription: (p) => `Der Monatspreis des Tarifs ${p} wird dem geschätzten lokalen Monatseinkommen gegenübergestellt, um die tatsächliche Belastung nach Region zu zeigen.`,
    highestBurden: "Am schwersten bezahlbar", lowestBurden: "Am leichtesten bezahlbar", usBase: "US-Referenz",
    highestBurdenHelper: (s,t) => `${s} des Monatseinkommens · ${t}× die US-Belastung`,
    lowestBurdenHelper: (s,t) => `${s} des Monatseinkommens · ${t}× die US-Belastung`,
    usBaseHelper: (s) => `${s} des Monatseinkommens · Referenz 1,00×`,
    chartTitle: "Rangliste der lokalen Abonnementbelastung",
    chartDescription: "Je höher der Wert, desto größer der Anteil am lokalen Einkommen. Die Markierung in jedem Balken entspricht der US-Referenz von 1,00×.",
    pressureFirst: "Höchste Belastung", accessibleFirst: "Am erschwinglichsten", rank: "Rang", region: "Region",
    monthlyFee: "Monatspreis", burden: "Lokale Belastung", usBenchmark: "USA 1,00×",
    incomeShare: (s) => `${s} des Monatseinkommens`, monthlyIncome: (i) => `Geschätztes Monatseinkommen: ${i}`,
    priceCheaper: (v) => `${Math.abs(Math.round(v))}% günstiger als in den USA`,
    priceHigher: (v) => `${Math.abs(Math.round(v))}% teurer als in den USA`,
    priceSame: "Preis nahe am US-Niveau", relativeBurden: (v) => `${v}× die US-Belastung`,
    bands: { lighter: "Geringer als in den USA", similar: "Ähnlich wie in den USA", elevated: "Erhöhte Belastung", heavy: "Hohe Belastung", severe: "Sehr hohe Belastung" },
    methodLabel: "Methode", method: "Der Monatspreis wird durch das geschätzte lokale Monatseinkommen geteilt und mit dem Einkommensanteil desselben Tarifs in den USA verglichen. Der Wert misst die relative Belastung, nicht das persönliche Einkommen oder die Zahlungsfähigkeit.",
    dataNote: (m,i,y,c) => `Einkommensindikator: ${m}${i ? ` (${i})` : ""}. Datenjahr: ${y}. Preis geprüft am: ${c}. Die Ergebnisse beschreiben regionale Preisbelastung, nicht individuelle Zahlungsfähigkeit.`,
    showMore: (c) => `${c} weitere Regionen anzeigen`, collapse: "Weniger Regionen anzeigen",
  },
  pt: {
    times: "×", sectionTitle: (p) => `Poder de compra local para ${p}`,
    sectionDescription: (p) => `O custo mensal do plano ${p} é comparado com o rendimento mensal local estimado para mostrar o peso real da assinatura em cada região.`,
    highestBurden: "Mais difícil de suportar", lowestBurden: "Mais acessível", usBase: "Referência dos EUA",
    highestBurdenHelper: (s,t) => `${s} do rendimento mensal · ${t}× o peso nos EUA`,
    lowestBurdenHelper: (s,t) => `${s} do rendimento mensal · ${t}× o peso nos EUA`,
    usBaseHelper: (s) => `${s} do rendimento mensal · referência 1,00×`,
    chartTitle: "Classificação do peso local da assinatura",
    chartDescription: "Quanto maior o valor, maior a parcela do rendimento local consumida. A marca em cada barra representa a referência dos EUA de 1,00×.",
    pressureFirst: "Maior peso", accessibleFirst: "Mais acessível", rank: "Posição", region: "Região",
    monthlyFee: "Custo mensal", burden: "Peso local", usBenchmark: "EUA 1,00×",
    incomeShare: (s) => `${s} do rendimento mensal`, monthlyIncome: (i) => `Rendimento mensal estimado: ${i}`,
    priceCheaper: (v) => `${Math.abs(Math.round(v))}% mais barato do que nos EUA`,
    priceHigher: (v) => `${Math.abs(Math.round(v))}% mais caro do que nos EUA`,
    priceSame: "Preço próximo do valor dos EUA", relativeBurden: (v) => `${v}× o peso nos EUA`,
    bands: { lighter: "Menor do que nos EUA", similar: "Semelhante aos EUA", elevated: "Peso acrescido", heavy: "Peso elevado", severe: "Peso muito elevado" },
    methodLabel: "Método", method: "O custo mensal é dividido pelo rendimento mensal local estimado e comparado com a percentagem de rendimento do mesmo plano nos EUA. O indicador mede pressão relativa, não rendimento individual nem a possibilidade de concluir o pagamento.",
    dataNote: (m,i,y,c) => `Indicador de rendimento: ${m}${i ? ` (${i})` : ""}. Ano dos dados: ${y}. Preço verificado em: ${c}. Os resultados descrevem pressão regional, não capacidade individual de pagamento.`,
    showMore: (c) => `Mostrar mais ${c} regiões`, collapse: "Mostrar menos regiões",
  },
} satisfies Record<
  Exclude<PreparedSiteLocale, "zh-tw">,
  AffordabilityCopy
>);

function getAffordabilityCopy(locale: PreparedSiteLocale) {
  return affordabilityCopy[locale];
}

function formatPercent(
  value: number,
  locale: PreparedSiteLocale,
  digits = 2,
) {
  return formatLocalizedPercent(value / 100, locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatUsd(
  value: number,
  locale: PreparedSiteLocale,
  digits = 2,
) {
  return formatLocalizedCurrency(value, "USD", locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatDate(
  value: Date | string | null | undefined,
  locale: PreparedSiteLocale,
) {
  if (!value) return "-";

  return formatLocalizedDate(value, locale) || "-";
}

function metricLabel(metricType?: string | null) {
  const map: Record<string, string> = {
    GNI_PPP: "GNI per capita, PPP",
    GNI_ATLAS: "GNI per capita, Atlas method",
    GDP_NOMINAL: "GDP per capita, current US$",
  };

  return metricType ? map[metricType] || metricType : "-";
}

function getCountryName(
  row: PlanAffordabilityRow | null | undefined,
  locale: PreparedSiteLocale,
) {
  if (!row) return "-";

  const localizedName = getLocalizedRegionName(row.countryCode, locale);
  if (localizedName) return localizedName;

  if (locale === "zh" || locale === "zh-tw") {
    return row.countryNameZh || row.countryNameEn || row.countryCode;
  }

  return row.countryNameEn || row.countryNameZh || row.countryCode;
}

function getBurdenTone(value: number) {
  if (value > 4) {
    return {
      bar: "bg-rose-500",
      text: "text-rose-600 dark:text-rose-300",
      badge: "bg-rose-50 text-rose-600 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-800",
      band: "severe" as const,
    };
  }

  if (value > 2) {
    return {
      bar: "bg-orange-500",
      text: "text-orange-600 dark:text-orange-300",
      badge: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:ring-orange-800",
      band: "heavy" as const,
    };
  }

  if (value > 1.2) {
    return {
      bar: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-300",
      badge: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800",
      band: "elevated" as const,
    };
  }

  if (value >= 0.8) {
    return {
      bar: "bg-sky-500",
      text: "text-sky-700 dark:text-sky-300",
      badge: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:ring-sky-800",
      band: "similar" as const,
    };
  }

  return {
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800",
    band: "lighter" as const,
  };
}

function getPriceComparison(
  row: PlanAffordabilityRow,
  locale: PreparedSiteLocale,
) {
  const copy = getAffordabilityCopy(locale);
  if (row.diffVsUsPercent < -1) return copy.priceCheaper(row.diffVsUsPercent);
  if (row.diffVsUsPercent > 1) return copy.priceHigher(row.diffVsUsPercent);
  return copy.priceSame;
}

function SummaryMetric({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "green" | "red";
}) {
  const valueClass =
    tone === "green"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "red"
        ? "text-rose-600 dark:text-rose-300"
        : "text-zinc-950 dark:text-white";

  return (
    <div className="min-w-0 px-3 py-4 md:px-5 md:py-5">
      <div className="truncate text-[11px] font-medium text-zinc-400 sm:text-xs">{label}</div>
      <div className={`mt-1 truncate text-base font-semibold md:text-lg ${valueClass}`}>{value}</div>
      <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-zinc-400 md:text-xs md:leading-5">
        {helper}
      </div>
    </div>
  );
}

function BurdenRow({
  row,
  rank,
  maxBurden,
  locale,
}: {
  row: PlanAffordabilityRow;
  rank: number;
  maxBurden: number;
  locale: PreparedSiteLocale;
}) {
  const copy = getAffordabilityCopy(locale);
  const tone = getBurdenTone(row.burdenVsUs);
  const barWidth = Math.max(3, Math.min(100, (row.burdenVsUs / maxBurden) * 100));
  const benchmarkPosition = Math.max(2, Math.min(98, (1 / maxBurden) * 100));
  const isUs = row.countryCode.toUpperCase() === "US";

  return (
    <div className="grid gap-3 border-b border-zinc-100 px-5 py-4 last:border-b-0 md:grid-cols-[52px_minmax(140px,0.8fr)_120px_minmax(280px,1.5fr)] md:items-center md:px-6 dark:border-zinc-800">
      <div className="text-sm tabular-nums text-zinc-400">#{rank}</div>

      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
          {getCountryName(row, locale)}
        </div>
        <div className="mt-0.5 text-xs text-zinc-400">{row.countryCode}</div>
      </div>

      <div>
        <div className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-white">
          {formatUsd(row.priceUsd, locale)}
        </div>
        <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {getPriceComparison(row, locale)}
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className={`text-base font-semibold tabular-nums ${tone.text}`}>
              {row.burdenVsUs.toFixed(2)}{copy.times}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {copy.incomeShare(formatPercent(row.incomeSharePercent, locale))}
            </span>
          </div>
          <span className={["inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", tone.badge].join(" ")}>
            {isUs ? copy.usBenchmark : copy.bands[tone.band]}
          </span>
        </div>

        <div className="relative h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${barWidth}%` }} />
          <span
            className="absolute inset-y-0 w-px bg-zinc-950/70 dark:bg-white/80"
            style={{ left: `${benchmarkPosition}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="mt-1.5 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[11px] text-zinc-400">
          <span>{copy.monthlyIncome(formatUsd(row.monthlyIncomeUsd, locale, 0))}</span>
          <span>{copy.relativeBurden(row.burdenVsUs.toFixed(2))}</span>
        </div>
      </div>
    </div>
  );
}

export default function AffordabilityComparison({
  productName,
  planName,
  summary,
  rows,
  locale = "zh",
}: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("pressure");
  const copy = getAffordabilityCopy(locale);
  const model = useMemo(() => {
    const descending = [...rows].sort((a, b) => b.burdenVsUs - a.burdenVsUs);
    const ascending = [...descending].reverse();

    return {
      descending,
      ascending,
      highest: descending[0],
      lowest: ascending[0],
      us: rows.find((row) => row.countryCode.toUpperCase() === "US"),
    };
  }, [rows]);

  if (!summary || rows.length === 0) return null;

  const orderedRows = sortMode === "pressure" ? model.descending : model.ascending;
  const initialVisibleCount = Math.min(8, orderedRows.length);
  const visibleRows = orderedRows.slice(0, initialVisibleCount);
  const hiddenRows = orderedRows.slice(initialVisibleCount);
  const maxBurden = Math.max(1, ...rows.map((row) => row.burdenVsUs));
  const latestPriceCheckedAt = rows
    .map((row) => row.priceLastCheckedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(String(b)).getTime() - new Date(String(a)).getTime())[0];

  return (
    <PublicSection>
      <PublicSectionHeader
        title={copy.sectionTitle(productName)}
        description={copy.sectionDescription(planName)}
      />

      <div className="grid grid-cols-3 divide-x divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
        <SummaryMetric
          label={copy.highestBurden}
          value={getCountryName(model.highest, locale)}
          helper={copy.highestBurdenHelper(
            formatPercent(model.highest.incomeSharePercent, locale),
            model.highest.burdenVsUs.toFixed(2),
          )}
          tone="red"
        />
        <SummaryMetric
          label={copy.lowestBurden}
          value={getCountryName(model.lowest, locale)}
          helper={copy.lowestBurdenHelper(
            formatPercent(model.lowest.incomeSharePercent, locale),
            model.lowest.burdenVsUs.toFixed(2),
          )}
          tone="green"
        />
        <SummaryMetric
          label={copy.usBase}
          value={model.us ? formatPercent(model.us.incomeSharePercent, locale) : "-"}
          helper={copy.usBaseHelper(
            model.us ? formatPercent(model.us.incomeSharePercent, locale) : "-",
          )}
        />
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-end md:justify-between md:px-6">
          <div className="max-w-2xl">
            <h3 className="text-base font-semibold text-zinc-950 dark:text-white">{copy.chartTitle}</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{copy.chartDescription}</p>
          </div>
          <div className="inline-flex w-fit rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900" aria-label={copy.chartTitle}>
            {(["pressure", "accessible"] as SortMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={sortMode === mode}
                className={[
                  "h-8 rounded-md px-3 text-xs font-medium transition",
                  sortMode === mode
                    ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
                ].join(" ")}
                onClick={() => setSortMode(mode)}
              >
                {mode === "pressure" ? copy.pressureFirst : copy.accessibleFirst}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden gap-3 border-y border-zinc-100 bg-zinc-50/70 px-5 py-3 text-xs font-medium text-zinc-400 md:grid md:grid-cols-[52px_minmax(140px,0.8fr)_120px_minmax(280px,1.5fr)] md:px-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div>{copy.rank}</div>
          <div>{copy.region}</div>
          <div>{copy.monthlyFee}</div>
          <div className="flex items-center justify-between gap-3">
            <span>{copy.burden}</span>
            <span className="font-normal">{copy.usBenchmark}</span>
          </div>
        </div>

        {visibleRows.map((row, index) => (
          <BurdenRow
            key={`${sortMode}-${row.planSlug}-${row.countryCode}`}
            row={row}
            rank={index + 1}
            maxBurden={maxBurden}
            locale={locale}
          />
        ))}

        <ExpandableAffordabilityRows
          hiddenCount={hiddenRows.length}
          showLabel={copy.showMore(hiddenRows.length)}
          hideLabel={copy.collapse}
        >
          {hiddenRows.map((row, index) => (
            <BurdenRow
              key={`${sortMode}-${row.planSlug}-${row.countryCode}`}
              row={row}
              rank={initialVisibleCount + index + 1}
              maxBurden={maxBurden}
              locale={locale}
            />
          ))}
        </ExpandableAffordabilityRows>
      </div>

      <div className="border-t border-zinc-100 px-5 py-4 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 md:px-6">
        <span className="mr-2 font-semibold text-zinc-700 dark:text-zinc-200">{copy.methodLabel}</span>
        {copy.method}
      </div>

      <DataNote>
        {copy.dataNote(
          metricLabel(summary.incomeMetricType),
          summary.incomeIndicatorCode || "",
          String(summary.incomeDataYear || "-"),
          formatDate(latestPriceCheckedAt, locale),
        )}
      </DataNote>
    </PublicSection>
  );
}
