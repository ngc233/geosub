import "server-only";

import path from "node:path";
import PDFKitDocument from "pdfkit";
import type { PricingReportDataset, PricingReportRow } from "./pricing-report";
import type { SiteLocale } from "./site-locale";

const MARGIN = 40;

const reportCopy: Record<SiteLocale, {
  subtitle: string; product: string; plans: string; rows: string; lastVerified: string;
  fxDate: string; generated: string; datasetVersion: string; snapshotId: string;
  howToRead: string; explanation: string; canonicalUrls: string; productPage: string;
  reportUrl: string; billing: (billing: string, count: number) => string; region: string;
  localPrice: string; usd: string; versusUs: string; taxNote: string; source: string;
  continued: string; provenance: string; pricingSources: string; exchangeRates: string;
  noFx: string; taxTreatment: string; taxExplanation: string; citation: string;
  verification: string; schema: string; page: string; unavailable: string;
  noUsBase: string; baseline: string; urlNotLinked: string; rateDate: string;
  sourceStatus: Record<string, string>;
}> = {
  zh: { subtitle: "当前地区价格、数据来源与引用信息", product: "产品", plans: "已发布套餐", rows: "地区价格记录", lastVerified: "价格最后核验", fxDate: "最新汇率日期", generated: "生成时间（UTC）", datasetVersion: "数据版本", snapshotId: "快照 ID", howToRead: "如何阅读本报告", explanation: "本报告的每一行均来自产品页面使用的同一份 GeoSub 标准价格数据。来源表示底层价格证据，引用信息说明如何引用本次 GeoSub 数据快照；缺少来源链接时会明确标注。", canonicalUrls: "固定网址", productPage: "产品页面", reportUrl: "报告网址", billing: (billing, count) => `${billing}计费 · ${count} 个地区`, region: "地区", localPrice: "当地价格", usd: "美元", versusUs: "对比美国", taxNote: "税费 / 说明", source: "来源", continued: "续表", provenance: "数据来源与血缘", pricingSources: "价格来源", exchangeRates: "汇率来源", noFx: "当前快照没有可链接的汇率提供方；美元折算值沿用标准价格记录中已发布的数据。", taxTreatment: "税费处理", taxExplanation: "税费字段复现 GeoSub 标准数据中各地区的税费口径与说明，仅描述已知的页面展示价格处理方式，不构成税务建议。", citation: "建议引用格式", verification: "核验元数据", schema: "结构版本", page: "第 {page} 页", unavailable: "暂无", noUsBase: "无美国基准", baseline: "基准", urlNotLinked: "未提供链接", rateDate: "汇率日期", sourceStatus: { official: "官方", linked: "有链接", named: "已注明", unlinked: "未链接" } },
  "zh-tw": { subtitle: "目前地區價格、資料來源與引用資訊", product: "產品", plans: "已發布方案", rows: "地區價格記錄", lastVerified: "價格最後核驗", fxDate: "最新匯率日期", generated: "產生時間（UTC）", datasetVersion: "資料版本", snapshotId: "快照 ID", howToRead: "如何閱讀本報告", explanation: "本報告每一列均來自產品頁面使用的同一份 GeoSub 標準價格資料。來源表示底層價格證據，引用資訊說明如何引用本次 GeoSub 資料快照；缺少來源連結時會明確標示。", canonicalUrls: "固定網址", productPage: "產品頁面", reportUrl: "報告網址", billing: (billing, count) => `${billing}計費 · ${count} 個地區`, region: "地區", localPrice: "當地價格", usd: "美元", versusUs: "對比美國", taxNote: "稅費 / 說明", source: "來源", continued: "續表", provenance: "資料來源與血緣", pricingSources: "價格來源", exchangeRates: "匯率來源", noFx: "目前快照沒有可連結的匯率提供方；美元換算值沿用標準價格記錄中已發布的資料。", taxTreatment: "稅費處理", taxExplanation: "稅費欄位重現 GeoSub 標準資料中各地區的稅費口徑與說明，僅描述已知的頁面顯示價格處理方式，不構成稅務建議。", citation: "建議引用格式", verification: "核驗中繼資料", schema: "結構版本", page: "第 {page} 頁", unavailable: "暫無", noUsBase: "無美國基準", baseline: "基準", urlNotLinked: "未提供連結", rateDate: "匯率日期", sourceStatus: { official: "官方", linked: "有連結", named: "已註明", unlinked: "未連結" } },
  en: { subtitle: "Current regional prices, provenance and citation metadata", product: "Product", plans: "Published plans", rows: "Regional price rows", lastVerified: "Last price verification", fxDate: "Latest exchange-rate date", generated: "Generated at (UTC)", datasetVersion: "Dataset version", snapshotId: "Snapshot ID", howToRead: "How to read this report", explanation: "Every row is generated from the same canonical GeoSub pricing dataset used by the product page. Source identifies the underlying price evidence. Citation explains how to reference this GeoSub snapshot. Missing source links remain explicitly unlinked.", canonicalUrls: "Canonical URLs", productPage: "Product page", reportUrl: "Report URL", billing: (billing, count) => `${billing} billing - ${count} regions`, region: "Region", localPrice: "Local price", usd: "USD", versusUs: "vs US", taxNote: "Tax / note", source: "Source", continued: "continued", provenance: "Data provenance", pricingSources: "Pricing sources", exchangeRates: "Exchange rates", noFx: "No linked exchange-rate provider was available in the current snapshot. USD equivalents remain those stored in the canonical published price records.", taxTreatment: "Tax treatment", taxExplanation: "Tax fields reproduce the canonical GeoSub tax treatment and note for each published regional price. They describe displayed-price treatment where known and are not tax advice.", citation: "Suggested citation", verification: "Verification metadata", schema: "Schema", page: "Page {page}", unavailable: "Not available", noUsBase: "No US base", baseline: "Baseline", urlNotLinked: "URL not linked", rateDate: "rate date", sourceStatus: { official: "official", linked: "linked", named: "named", unlinked: "unlinked" } },
  ja: {} as never, ko: {} as never, es: {} as never, tr: {} as never, ar: {} as never, fr: {} as never, it: {} as never, de: {} as never, pt: {} as never,
};

for (const locale of ["ja", "ko", "es", "tr", "ar", "fr", "it", "de", "pt"] as const) {
  reportCopy[locale] = { ...reportCopy.en, sourceStatus: { ...reportCopy.en.sourceStatus } };
}

Object.assign(reportCopy.ja, { subtitle: "現在の地域別価格、データ出典、引用情報", product: "製品", plans: "公開プラン", rows: "地域別価格件数", lastVerified: "価格の最終確認日", fxDate: "最新の為替レート日", generated: "生成日時（UTC）", datasetVersion: "データセット版", snapshotId: "スナップショット ID", howToRead: "このレポートの読み方", canonicalUrls: "固定 URL", productPage: "製品ページ", reportUrl: "レポート URL", billing: (billing: string, count: number) => `${billing}請求 · ${count}地域`, region: "地域", localPrice: "現地価格", versusUs: "米国比", taxNote: "税 / 注記", source: "出典", continued: "続き", provenance: "データの出典", pricingSources: "価格情報源", exchangeRates: "為替レート", taxTreatment: "税の扱い", citation: "推奨引用形式", verification: "検証メタデータ", page: "{page} ページ", unavailable: "利用不可", noUsBase: "米国基準なし", baseline: "基準", urlNotLinked: "URL 未登録", rateDate: "レート日", sourceStatus: { official: "公式", linked: "リンクあり", named: "名称あり", unlinked: "未リンク" } });
Object.assign(reportCopy.ko, { subtitle: "현재 지역별 가격, 데이터 출처 및 인용 정보", product: "제품", plans: "공개 요금제", rows: "지역 가격 항목", lastVerified: "가격 최종 확인", fxDate: "최신 환율 날짜", generated: "생성 시각(UTC)", datasetVersion: "데이터 버전", snapshotId: "스냅샷 ID", howToRead: "보고서 읽는 방법", canonicalUrls: "고정 URL", productPage: "제품 페이지", reportUrl: "보고서 URL", billing: (billing: string, count: number) => `${billing} 결제 · ${count}개 지역`, region: "지역", localPrice: "현지 가격", versusUs: "미국 대비", taxNote: "세금 / 설명", source: "출처", continued: "계속", provenance: "데이터 출처", pricingSources: "가격 출처", exchangeRates: "환율 출처", taxTreatment: "세금 처리", citation: "권장 인용 형식", verification: "검증 메타데이터", page: "{page}페이지", unavailable: "없음", noUsBase: "미국 기준 없음", baseline: "기준", urlNotLinked: "URL 없음", rateDate: "환율 날짜", sourceStatus: { official: "공식", linked: "링크됨", named: "명시됨", unlinked: "미연결" } });
Object.assign(reportCopy.es, { subtitle: "Precios regionales actuales, procedencia y datos de citación", product: "Producto", plans: "Planes publicados", rows: "Registros regionales", lastVerified: "Última verificación", fxDate: "Fecha de cambio más reciente", generated: "Generado (UTC)", datasetVersion: "Versión de datos", snapshotId: "ID de captura", howToRead: "Cómo leer este informe", canonicalUrls: "URL permanentes", productPage: "Página del producto", reportUrl: "URL del informe", billing: (billing: string, count: number) => `${billing} · ${count} regiones`, region: "Región", localPrice: "Precio local", versusUs: "vs. EE. UU.", taxNote: "Impuestos / nota", source: "Fuente", continued: "continuación", provenance: "Procedencia de los datos", pricingSources: "Fuentes de precios", exchangeRates: "Tipos de cambio", taxTreatment: "Tratamiento fiscal", citation: "Cita sugerida", verification: "Metadatos de verificación", page: "Página {page}", unavailable: "No disponible", noUsBase: "Sin base de EE. UU.", baseline: "Base", urlNotLinked: "URL no enlazada", rateDate: "fecha del tipo", sourceStatus: { official: "oficial", linked: "enlazada", named: "identificada", unlinked: "sin enlace" } });
Object.assign(reportCopy.tr, { subtitle: "Güncel bölgesel fiyatlar, veri kaynakları ve atıf bilgileri", product: "Ürün", plans: "Yayımlanan planlar", rows: "Bölgesel fiyat satırları", lastVerified: "Son fiyat doğrulaması", fxDate: "Son kur tarihi", generated: "Oluşturulma (UTC)", datasetVersion: "Veri sürümü", snapshotId: "Anlık görüntü kimliği", howToRead: "Bu rapor nasıl okunur", canonicalUrls: "Kalıcı URL'ler", productPage: "Ürün sayfası", reportUrl: "Rapor URL'si", billing: (billing: string, count: number) => `${billing} · ${count} bölge`, region: "Bölge", localPrice: "Yerel fiyat", versusUs: "ABD'ye göre", taxNote: "Vergi / not", source: "Kaynak", continued: "devam", provenance: "Veri kaynağı", pricingSources: "Fiyat kaynakları", exchangeRates: "Döviz kurları", taxTreatment: "Vergi uygulaması", citation: "Önerilen atıf", verification: "Doğrulama bilgileri", page: "Sayfa {page}", unavailable: "Mevcut değil", noUsBase: "ABD tabanı yok", baseline: "Temel", urlNotLinked: "URL bağlı değil", rateDate: "kur tarihi", sourceStatus: { official: "resmî", linked: "bağlantılı", named: "belirtilmiş", unlinked: "bağlantısız" } });
Object.assign(reportCopy.ar, { subtitle: "الأسعار الإقليمية الحالية ومصادر البيانات ومعلومات الاقتباس", product: "المنتج", plans: "الخطط المنشورة", rows: "سجلات الأسعار الإقليمية", lastVerified: "آخر تحقق من السعر", fxDate: "أحدث تاريخ لسعر الصرف", generated: "وقت الإنشاء (UTC)", datasetVersion: "إصدار البيانات", snapshotId: "معرف اللقطة", howToRead: "كيفية قراءة التقرير", canonicalUrls: "الروابط الثابتة", productPage: "صفحة المنتج", reportUrl: "رابط التقرير", billing: (billing: string, count: number) => `${billing} · ${count} منطقة`, region: "المنطقة", localPrice: "السعر المحلي", versusUs: "مقابل أمريكا", taxNote: "الضريبة / ملاحظة", source: "المصدر", continued: "تابع", provenance: "مصادر البيانات", pricingSources: "مصادر الأسعار", exchangeRates: "أسعار الصرف", taxTreatment: "المعالجة الضريبية", citation: "صيغة الاقتباس المقترحة", verification: "بيانات التحقق", page: "الصفحة {page}", unavailable: "غير متاح", noUsBase: "لا يوجد أساس أمريكي", baseline: "الأساس", urlNotLinked: "الرابط غير متوفر", rateDate: "تاريخ السعر", sourceStatus: { official: "رسمي", linked: "مرتبط", named: "مذكور", unlinked: "غير مرتبط" } });
Object.assign(reportCopy.fr, { subtitle: "Prix régionaux actuels, provenance et informations de citation", product: "Produit", plans: "Offres publiées", rows: "Lignes de prix régionales", lastVerified: "Dernière vérification", fxDate: "Dernière date de change", generated: "Généré (UTC)", datasetVersion: "Version des données", snapshotId: "ID de capture", howToRead: "Comment lire ce rapport", canonicalUrls: "URL permanentes", productPage: "Page produit", reportUrl: "URL du rapport", billing: (billing: string, count: number) => `${billing} · ${count} régions`, region: "Région", localPrice: "Prix local", versusUs: "vs États-Unis", taxNote: "Taxe / note", source: "Source", continued: "suite", provenance: "Provenance des données", pricingSources: "Sources tarifaires", exchangeRates: "Taux de change", taxTreatment: "Traitement fiscal", citation: "Citation suggérée", verification: "Métadonnées de vérification", page: "Page {page}", unavailable: "Indisponible", noUsBase: "Sans base US", baseline: "Référence", urlNotLinked: "URL non liée", rateDate: "date du taux", sourceStatus: { official: "officielle", linked: "liée", named: "nommée", unlinked: "non liée" } });
Object.assign(reportCopy.it, { subtitle: "Prezzi regionali attuali, provenienza e dati di citazione", product: "Prodotto", plans: "Piani pubblicati", rows: "Righe di prezzo regionali", lastVerified: "Ultima verifica", fxDate: "Data cambio più recente", generated: "Generato (UTC)", datasetVersion: "Versione dati", snapshotId: "ID snapshot", howToRead: "Come leggere il rapporto", canonicalUrls: "URL permanenti", productPage: "Pagina prodotto", reportUrl: "URL rapporto", billing: (billing: string, count: number) => `${billing} · ${count} regioni`, region: "Regione", localPrice: "Prezzo locale", versusUs: "vs USA", taxNote: "Imposte / nota", source: "Fonte", continued: "continua", provenance: "Provenienza dei dati", pricingSources: "Fonti dei prezzi", exchangeRates: "Tassi di cambio", taxTreatment: "Trattamento fiscale", citation: "Citazione suggerita", verification: "Metadati di verifica", page: "Pagina {page}", unavailable: "Non disponibile", noUsBase: "Nessuna base USA", baseline: "Base", urlNotLinked: "URL non collegato", rateDate: "data del tasso", sourceStatus: { official: "ufficiale", linked: "collegata", named: "indicata", unlinked: "non collegata" } });
Object.assign(reportCopy.de, { subtitle: "Aktuelle regionale Preise, Datenherkunft und Zitierangaben", product: "Produkt", plans: "Veröffentlichte Tarife", rows: "Regionale Preiszeilen", lastVerified: "Letzte Preisprüfung", fxDate: "Letztes Wechselkursdatum", generated: "Erstellt (UTC)", datasetVersion: "Datenversion", snapshotId: "Snapshot-ID", howToRead: "So lesen Sie den Bericht", canonicalUrls: "Permanente URLs", productPage: "Produktseite", reportUrl: "Berichts-URL", billing: (billing: string, count: number) => `${billing} · ${count} Regionen`, region: "Region", localPrice: "Lokaler Preis", versusUs: "ggü. USA", taxNote: "Steuer / Hinweis", source: "Quelle", continued: "Fortsetzung", provenance: "Datenherkunft", pricingSources: "Preisquellen", exchangeRates: "Wechselkurse", taxTreatment: "Steuerbehandlung", citation: "Empfohlene Quellenangabe", verification: "Prüfmetadaten", page: "Seite {page}", unavailable: "Nicht verfügbar", noUsBase: "Keine US-Basis", baseline: "Basis", urlNotLinked: "URL nicht verknüpft", rateDate: "Kursdatum", sourceStatus: { official: "offiziell", linked: "verknüpft", named: "benannt", unlinked: "nicht verknüpft" } });
Object.assign(reportCopy.pt, { subtitle: "Preços regionais atuais, proveniência e dados de citação", product: "Produto", plans: "Planos publicados", rows: "Linhas de preços regionais", lastVerified: "Última verificação", fxDate: "Data de câmbio mais recente", generated: "Gerado (UTC)", datasetVersion: "Versão dos dados", snapshotId: "ID do snapshot", howToRead: "Como ler este relatório", canonicalUrls: "URLs permanentes", productPage: "Página do produto", reportUrl: "URL do relatório", billing: (billing: string, count: number) => `${billing} · ${count} regiões`, region: "Região", localPrice: "Preço local", versusUs: "vs EUA", taxNote: "Imposto / nota", source: "Fonte", continued: "continuação", provenance: "Proveniência dos dados", pricingSources: "Fontes de preços", exchangeRates: "Taxas de câmbio", taxTreatment: "Tratamento fiscal", citation: "Citação sugerida", verification: "Metadados de verificação", page: "Página {page}", unavailable: "Indisponível", noUsBase: "Sem base dos EUA", baseline: "Base", urlNotLinked: "URL não vinculada", rateDate: "data da taxa", sourceStatus: { official: "oficial", linked: "vinculada", named: "identificada", unlinked: "sem vínculo" } });

Object.assign(reportCopy.ja, { explanation: "各行は製品ページと同じ GeoSub 標準価格データから生成されています。出典は価格の根拠を示し、引用情報はこのデータスナップショットの参照方法を示します。出典 URL がない場合は明記されます。", noFx: "現在のスナップショットにはリンク済みの為替レート提供元がありません。米ドル換算額は公開価格レコードに保存された値です。", taxExplanation: "税項目は各地域価格の GeoSub 標準税区分と注記を再掲しています。既知の表示価格の扱いを示すもので、税務上の助言ではありません。" });
Object.assign(reportCopy.ko, { explanation: "각 행은 제품 페이지와 동일한 GeoSub 표준 가격 데이터에서 생성됩니다. 출처는 가격 근거를, 인용 정보는 이 데이터 스냅샷을 참조하는 방법을 설명합니다. 출처 URL이 없으면 명확히 표시합니다.", noFx: "현재 스냅샷에는 연결된 환율 제공자가 없습니다. 미국 달러 환산값은 게시된 표준 가격 기록에 저장된 값을 사용합니다.", taxExplanation: "세금 항목은 각 지역 가격의 GeoSub 표준 세금 처리와 설명을 재현합니다. 알려진 표시 가격 처리 방식만 설명하며 세무 조언이 아닙니다." });
Object.assign(reportCopy.es, { explanation: "Cada fila procede del mismo conjunto de datos canónico de GeoSub que utiliza la página del producto. La fuente identifica la evidencia del precio y la cita explica cómo referenciar esta captura. Las URL ausentes se indican expresamente.", noFx: "No hay un proveedor de tipos de cambio enlazado en esta captura. Los equivalentes en USD son los almacenados en los registros de precios publicados.", taxExplanation: "Los campos fiscales reproducen el tratamiento y la nota canónicos de GeoSub para cada precio regional. Describen el precio mostrado cuando se conoce y no constituyen asesoramiento fiscal." });
Object.assign(reportCopy.tr, { explanation: "Her satır, ürün sayfasında kullanılan aynı GeoSub standart fiyat veri kümesinden üretilir. Kaynak fiyat kanıtını, atıf bilgisi ise bu veri anlık görüntüsünün nasıl referans verileceğini açıklar. Eksik kaynak URL'leri açıkça belirtilir.", noFx: "Bu anlık görüntüde bağlantılı bir döviz kuru sağlayıcısı yoktur. USD karşılıkları yayımlanmış standart fiyat kayıtlarında saklanan değerlerdir.", taxExplanation: "Vergi alanları her bölgesel fiyat için GeoSub standart vergi uygulamasını ve notunu yeniden üretir. Bilinen görüntülenen fiyat uygulamasını açıklar ve vergi danışmanlığı değildir." });
Object.assign(reportCopy.ar, { explanation: "يتم إنشاء كل صف من مجموعة بيانات الأسعار القياسية نفسها في GeoSub والمستخدمة في صفحة المنتج. يحدد المصدر دليل السعر، وتوضح معلومات الاقتباس كيفية الإشارة إلى لقطة البيانات هذه. ويشار بوضوح إلى روابط المصادر المفقودة.", noFx: "لا يتوفر مزود مرتبط لأسعار الصرف في اللقطة الحالية. وتعتمد القيم المحولة إلى الدولار على القيم المحفوظة في سجلات الأسعار المنشورة.", taxExplanation: "تعرض حقول الضرائب معالجة GeoSub القياسية وملاحظتها لكل سعر إقليمي. وهي تصف معالجة السعر المعروض عند معرفتها ولا تمثل مشورة ضريبية." });
Object.assign(reportCopy.fr, { explanation: "Chaque ligne provient du même jeu de données tarifaires canonique GeoSub que la page produit. La source identifie la preuve du prix et la citation indique comment référencer cette capture. Les URL manquantes sont signalées explicitement.", noFx: "Aucun fournisseur de taux de change lié n'est disponible dans cette capture. Les équivalents USD sont ceux enregistrés dans les prix publiés.", taxExplanation: "Les champs fiscaux reproduisent le traitement et la note canoniques GeoSub pour chaque prix régional. Ils décrivent le prix affiché lorsqu'il est connu et ne constituent pas un conseil fiscal." });
Object.assign(reportCopy.it, { explanation: "Ogni riga proviene dallo stesso set di dati canonico GeoSub usato dalla pagina del prodotto. La fonte identifica la prova del prezzo e la citazione spiega come fare riferimento a questo snapshot. Le URL mancanti sono indicate esplicitamente.", noFx: "Nello snapshot corrente non è disponibile un fornitore di cambi collegato. Gli equivalenti in USD sono quelli salvati nei prezzi pubblicati.", taxExplanation: "I campi fiscali riproducono il trattamento e la nota canonici GeoSub per ogni prezzo regionale. Descrivono il prezzo visualizzato quando noto e non costituiscono consulenza fiscale." });
Object.assign(reportCopy.de, { explanation: "Jede Zeile stammt aus demselben kanonischen GeoSub-Preissatz wie die Produktseite. Die Quelle bezeichnet den Preisnachweis, die Zitierangabe erklärt die Referenz auf diesen Snapshot. Fehlende Quell-URLs werden ausdrücklich markiert.", noFx: "Für diesen Snapshot ist kein verknüpfter Wechselkursanbieter verfügbar. Die USD-Werte entsprechen den in den veröffentlichten Preisdatensätzen gespeicherten Werten.", taxExplanation: "Die Steuerfelder geben die kanonische GeoSub-Steuerbehandlung und den Hinweis für jeden regionalen Preis wieder. Sie beschreiben bekannte Anzeigepreise und sind keine Steuerberatung." });
Object.assign(reportCopy.pt, { explanation: "Cada linha vem do mesmo conjunto de dados canónico de preços GeoSub utilizado na página do produto. A fonte identifica a evidência do preço e a citação explica como referenciar este snapshot. URLs ausentes são indicadas explicitamente.", noFx: "Não há fornecedor de câmbio vinculado neste snapshot. Os equivalentes em USD são os valores guardados nos registos de preços publicados.", taxExplanation: "Os campos fiscais reproduzem o tratamento e a nota canónicos da GeoSub para cada preço regional. Descrevem o preço apresentado quando conhecido e não constituem aconselhamento fiscal." });

const taxTreatmentCopy: Record<SiteLocale, Record<string, string>> = {
  zh: { unknown: "税费未知", tax_included: "已含税", tax_excluded: "未含税" },
  "zh-tw": { unknown: "稅費未知", tax_included: "已含稅", tax_excluded: "未含稅" },
  en: { unknown: "Tax unknown", tax_included: "Tax included", tax_excluded: "Tax excluded" },
  ja: { unknown: "税区分不明", tax_included: "税込", tax_excluded: "税別" },
  ko: { unknown: "세금 여부 미상", tax_included: "세금 포함", tax_excluded: "세금 별도" },
  es: { unknown: "Impuestos no confirmados", tax_included: "Impuestos incluidos", tax_excluded: "Impuestos no incluidos" },
  tr: { unknown: "Vergi durumu bilinmiyor", tax_included: "Vergi dahil", tax_excluded: "Vergi hariç" },
  ar: { unknown: "الضريبة غير مؤكدة", tax_included: "شامل الضريبة", tax_excluded: "غير شامل الضريبة" },
  fr: { unknown: "Fiscalité non confirmée", tax_included: "Taxes incluses", tax_excluded: "Taxes non incluses" },
  it: { unknown: "Imposte non confermate", tax_included: "Imposte incluse", tax_excluded: "Imposte escluse" },
  de: { unknown: "Steuerstatus unbekannt", tax_included: "Steuer enthalten", tax_excluded: "Steuer nicht enthalten" },
  pt: { unknown: "Impostos não confirmados", tax_included: "Impostos incluídos", tax_excluded: "Impostos não incluídos" },
};

function formatTaxTreatment(value: string, locale: SiteLocale) {
  return taxTreatmentCopy[locale][value] || value.replaceAll("_", " ");
}

const localeFontFiles: Record<SiteLocale, { regular: string; bold: string }> = {
  zh: { regular: "assets/fonts/NotoSansSC-VF.ttf", bold: "assets/fonts/NotoSansSC-VF.ttf" },
  "zh-tw": { regular: "assets/fonts/NotoSansSC-VF.ttf", bold: "assets/fonts/NotoSansSC-VF.ttf" },
  ja: { regular: "assets/fonts/NotoSansSC-VF.ttf", bold: "assets/fonts/NotoSansSC-VF.ttf" },
  ko: { regular: "assets/fonts/NotoSansKR-VF.ttf", bold: "assets/fonts/NotoSansKR-VF.ttf" },
  ar: { regular: "assets/fonts/NotoSansArabic-VF.ttf", bold: "assets/fonts/NotoSansArabic-VF.ttf" },
  en: { regular: "@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff", bold: "@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff" },
  es: { regular: "@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff", bold: "@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff" },
  tr: { regular: "@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff", bold: "@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff" },
  fr: { regular: "@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff", bold: "@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff" },
  it: { regular: "@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff", bold: "@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff" },
  de: { regular: "@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff", bold: "@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff" },
  pt: { regular: "@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff", bold: "@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff" },
};

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatLocal(row: PricingReportRow, locale: SiteLocale) {
  return `${row.localCurrency} ${row.localPrice.toLocaleString(locale, { maximumFractionDigits: 2 })}`;
}

function formatDifference(value: number | null, copy: typeof reportCopy.en) {
  if (value === null) return copy.noUsBase;
  if (Math.abs(value) < 0.05) return copy.baseline;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export async function renderPricingReportPdf(dataset: PricingReportDataset) {
  const copy = reportCopy[dataset.locale];
  const files = localeFontFiles[dataset.locale];
  const resolveFont = (fontPath: string) => fontPath.startsWith("assets/")
    ? path.join(/* turbopackIgnore: true */ process.cwd(), ...fontPath.split("/"))
    : path.join(/* turbopackIgnore: true */ process.cwd(), "node_modules", ...fontPath.split("/"));
  const regularFont = dataset.locale === "ko"
    ? path.join(/* turbopackIgnore: true */ process.cwd(), "assets", "fonts", "NotoSansKR-VF.ttf")
    : dataset.locale === "zh" || dataset.locale === "zh-tw" || dataset.locale === "ja"
      ? path.join(/* turbopackIgnore: true */ process.cwd(), "assets", "fonts", "NotoSansSC-VF.ttf")
      : resolveFont(files.regular);
  const boldFont = ["zh", "zh-tw", "ja", "ko", "ar"].includes(dataset.locale)
    ? regularFont
    : resolveFont(files.bold);
  const doc = new PDFKitDocument({ size: "A4", margin: MARGIN, bufferPages: true, font: regularFont, info: {
    Title: dataset.reportTitle,
    Author: "GeoSub",
    Subject: copy.subtitle,
    Keywords: `GeoSub, ${dataset.productName}, global pricing`,
    Creator: "GeoSub Global Pricing Report Export",
  } });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const output = new Promise<Uint8Array>((resolve, reject) => {
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.on("error", reject);
  });
  const ink = "#14191f";
  const muted = "#626872";
  const line = "#e0e3e6";
  const soft = "#f6f7f8";
  const accent = "#7ac700";
  const pageWidth = 595.28;
  const contentWidth = pageWidth - MARGIN * 2;
  const font = (bold = false) => doc.font(bold ? boldFont : regularFont);
  const addHeader = () => {
    font(true).fontSize(10).fillColor(ink).text("GeoSub", MARGIN, 25, { lineBreak: false });
    doc.circle(MARGIN + 42, 29, 2.6).fill(accent);
    font(false).fontSize(7.5).fillColor(muted).text(dataset.reportTitle, 300, 26, { width: pageWidth - MARGIN - 300, align: "right", lineBreak: false });
    doc.moveTo(MARGIN, 40).lineTo(pageWidth - MARGIN, 40).lineWidth(0.6).stroke(line);
  };
  const addPage = () => { doc.addPage(); addHeader(); };
  let y = 78;
  font(true).fontSize(25).fillColor(ink).text(dataset.reportTitle, MARGIN, y, { width: contentWidth });
  y = doc.y + 8;
  font(false).fontSize(10).fillColor(muted).text(copy.subtitle, MARGIN, y, { width: contentWidth });
  y = doc.y + 27;
  const summary = [
    [copy.product, dataset.productName], [copy.plans, String(new Set(dataset.rows.map((row) => row.planSlug)).size)],
    [copy.rows, String(dataset.rows.length)], [copy.lastVerified, dataset.lastUpdated || copy.unavailable],
    [copy.fxDate, dataset.exchangeRateUpdatedAt || copy.unavailable], [copy.generated, dataset.generatedAt],
    [copy.datasetVersion, dataset.datasetVersion], [copy.snapshotId, dataset.snapshotId],
  ];
  summary.forEach(([label, value], index) => {
    if (index % 2) doc.rect(MARGIN, y - 5, contentWidth, 27).fill(soft);
    font(true).fontSize(8).fillColor(muted).text(label, MARGIN + 10, y + 4, { width: 135, lineBreak: false });
    font(false).fontSize(8.2).fillColor(ink).text(value, MARGIN + 155, y + 4, { width: contentWidth - 165, lineBreak: false });
    y += 30;
  });
  y += 12;
  font(true).fontSize(12).fillColor(ink).text(copy.howToRead, MARGIN, y);
  y = doc.y + 7;
  font(false).fontSize(8.5).fillColor(muted).text(copy.explanation, MARGIN, y, { width: contentWidth, lineGap: 2 });
  y = doc.y + 20;
  font(true).fontSize(12).fillColor(ink).text(copy.canonicalUrls, MARGIN, y);
  y = doc.y + 7;
  font(false).fontSize(8).fillColor(muted).text(`${copy.productPage}: ${dataset.canonicalPageUrl}`, MARGIN, y, { width: contentWidth });
  y = doc.y + 7;
  doc.text(`${copy.reportUrl}: ${dataset.canonicalReportUrl}`, MARGIN, y, { width: contentWidth });

  const sourceKeys = new Map(dataset.pricingSources.map((source, index) => [`${source.name}|${source.url || ""}`, `S${index + 1}`]));
  const planGroups = [...new Map(dataset.rows.map((row) => [row.planSlug, { name: row.planName, billing: row.billingCycle }])).entries()];
  for (const [planSlug, planInfo] of planGroups) {
    addPage();
    y = 65;
    font(true).fontSize(17).fillColor(ink).text(planInfo.name, MARGIN, y);
    y = doc.y + 4;
    font(false).fontSize(8).fillColor(muted).text(copy.billing(planInfo.billing, dataset.rows.filter((row) => row.planSlug === planSlug).length), MARGIN, y);
    y = doc.y + 19;
    const columns = [
      { label: copy.region, x: MARGIN, width: 86 }, { label: copy.localPrice, x: MARGIN + 90, width: 80 },
      { label: copy.usd, x: MARGIN + 174, width: 55 }, { label: copy.versusUs, x: MARGIN + 233, width: 52 },
      { label: copy.taxNote, x: MARGIN + 289, width: 132 }, { label: copy.source, x: MARGIN + 425, width: 90 },
    ];
    const tableHeader = () => {
      doc.rect(MARGIN, y, contentWidth, 24).fill(soft);
      columns.forEach((column) => font(true).fontSize(7).fillColor(muted).text(column.label, column.x + 4, y + 8, { width: column.width - 8, lineBreak: false }));
      y += 25;
    };
    tableHeader();
    for (const row of dataset.rows.filter((item) => item.planSlug === planSlug)) {
      const sourceKey = sourceKeys.get(`${row.sourceName}|${row.sourceUrl || ""}`) || "-";
      const sourceLabel = `${sourceKey} ${copy.sourceStatus[row.sourceStatus]}`;
      const taxText = `${formatTaxTreatment(row.taxTreatment, dataset.locale)}. ${row.taxNote}`;
      font(false).fontSize(6.3);
      const rowHeight = Math.max(29, doc.heightOfString(taxText, { width: 124, lineGap: 0 }) + 10);
      if (y + rowHeight > 780) {
        addPage(); y = 66;
        font(true).fontSize(12).fillColor(ink).text(`${planInfo.name} - ${copy.continued}`, MARGIN, y);
        y = doc.y + 14; tableHeader();
      }
      doc.moveTo(MARGIN, y).lineTo(pageWidth - MARGIN, y).lineWidth(0.45).stroke(line);
      font(false).fontSize(7.1).fillColor(ink).text(`${row.region} (${row.regionCode})`, columns[0].x + 4, y + 9, { width: columns[0].width - 8, height: rowHeight - 8 });
      doc.text(formatLocal(row, dataset.locale), columns[1].x + 4, y + 9, { width: columns[1].width - 8, height: rowHeight - 8 });
      font(true).text(formatUsd(row.usdEquivalent), columns[2].x + 4, y + 9, { width: columns[2].width - 8, lineBreak: false });
      font(false).fontSize(7).text(formatDifference(row.differenceVsUsPercent, copy), columns[3].x + 4, y + 9, { width: columns[3].width - 8, lineBreak: false });
      font(false).fontSize(6.3).fillColor(muted).text(taxText, columns[4].x + 4, y + 7, { width: columns[4].width - 8, height: rowHeight - 6, lineGap: 0 });
      doc.fillColor(row.sourceStatus === "official" ? "#337a14" : muted).text(sourceLabel, columns[5].x + 4, y + 9, { width: columns[5].width - 8, height: rowHeight - 8 });
      y += rowHeight;
    }
  }

  addPage(); y = 65;
  font(true).fontSize(17).fillColor(ink).text(copy.provenance, MARGIN, y);
  y = doc.y + 16;
  font(true).fontSize(11).text(copy.pricingSources, MARGIN, y); y = doc.y + 8;
  dataset.pricingSources.forEach((source, index) => {
    const text = `S${index + 1}  [${copy.sourceStatus[source.status]}]  ${source.name}${source.url ? ` - ${source.url}` : ` - ${copy.urlNotLinked}`}`;
    font(false).fontSize(7.5).fillColor(muted).text(text, MARGIN, y, { width: contentWidth }); y = doc.y + 5;
  });
  y += 7; font(true).fontSize(11).fillColor(ink).text(copy.exchangeRates, MARGIN, y); y = doc.y + 8;
  if (!dataset.exchangeRateSources.length) {
    font(false).fontSize(7.5).fillColor(muted).text(copy.noFx, MARGIN, y, { width: contentWidth }); y = doc.y + 15;
  } else dataset.exchangeRateSources.forEach((source) => {
    font(false).fontSize(7.5).fillColor(muted).text(`${source.name} - ${copy.rateDate} ${source.date || copy.unavailable}`, MARGIN, y); y = doc.y + 5;
  });
  font(true).fontSize(11).fillColor(ink).text(copy.taxTreatment, MARGIN, y); y = doc.y + 8;
  font(false).fontSize(7.5).fillColor(muted).text(copy.taxExplanation, MARGIN, y, { width: contentWidth }); y = doc.y + 18;
  font(true).fontSize(11).fillColor(ink).text(copy.citation, MARGIN, y); y = doc.y + 8;
  doc.rect(MARGIN, y, contentWidth, 62).fill(soft);
  font(false).fontSize(8).fillColor(ink).text(dataset.citation, MARGIN + 10, y + 10, { width: contentWidth - 20, height: 44 }); y += 79;
  font(true).fontSize(11).text(copy.verification, MARGIN, y); y = doc.y + 8;
  font(false).fontSize(7.5).fillColor(muted).text(`${copy.snapshotId}: ${dataset.snapshotId}`, MARGIN, y); y = doc.y + 7;
  doc.text(`${copy.generated}: ${dataset.generatedAt} | ${copy.schema}: ${dataset.schemaVersion}`, MARGIN, y);

  const range = doc.bufferedPageRange();
  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(index);
    addHeader();
    doc.moveTo(MARGIN, 786).lineTo(pageWidth - MARGIN, 786).lineWidth(0.5).stroke(line);
    font(false).fontSize(6.5).fillColor(muted).text(dataset.datasetVersion, MARGIN, 794, { lineBreak: false });
    const pageLabel = copy.page.replace("{page}", String(index + 1));
    doc.text(pageLabel, pageWidth - MARGIN - 70, 794, { width: 70, align: "right", lineBreak: false });
  }
  doc.end();
  return output;
}
