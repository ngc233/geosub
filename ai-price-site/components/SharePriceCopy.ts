import type { SiteLocale } from '../lib/site-locale';
import { withTraditionalChinese } from '../lib/traditional-chinese';

export type ShareCopy = {
  button: string;
  dialogLabel: string;
  close: string;
  global: string;
  cardTitle: (productName: string) => string;
  planBadge: (planName: string, referencePrice: string) => string;
  cheapestRegion: string;
  cheaper: string;
  usBase: string;
  moreExpensive: string;
  cheapestList: string;
  expensiveList: string;
  verifiedAt: (date: string) => string;
  download: string;
  downloading: string;
  copyLink: string;
  copied: string;
  copyFailed: string;
  shareText: (planName: string, low: string, high: string, spread: number) => string;
  mapAria: (planName: string) => string;
  shareTo: (platform: string) => string;
  diffAbove: (percent: number) => string;
  diffBelow: (percent: number) => string;
  diffSame: string;
  comparisonLead: (lowest: string, highest: string) => string;
  comparisonTrail: string;
  monthlySuffix: string;
};

export const shareCopy = withTraditionalChinese({
  zh: {
    button: '分享价格图',
    dialogLabel: '分享价格图',
    close: '关闭弹窗',
    global: '全球',
    cardTitle: (productName) => `${productName} 各地区价格`,
    planBadge: (planName, referencePrice) => `${planName} 套餐 · 美国基准 ${referencePrice}`,
    cheapestRegion: '最低价地区',
    cheaper: '更便宜',
    usBase: '美国基准',
    moreExpensive: '更贵',
    cheapestList: '↓ 最便宜',
    expensiveList: '↑ 最贵',
    verifiedAt: (date) => `GeoSub · 数据校验于 ${date} · geosub.org`,
    download: '下载 PNG',
    downloading: '正在生成...',
    copyLink: '复制链接',
    copied: '已复制',
    copyFailed: '复制失败',
    shareText: (planName, low, high, spread) =>
      `${planName} 全球订阅价格对比：最低 ${low}，最高 ${high}，价差 ${spread}%。`,
    mapAria: (planName) => `${planName} 分享地图`,
    shareTo: (platform) => `分享到 ${platform}`,
    diffAbove: (percent) => `比美国贵 ${percent}%`,
    diffBelow: (percent) => `比美国便宜 ${percent}%`,
    diffSame: '与美国价格相同',
    comparisonLead: (lowest, highest) => `${lowest} 与 ${highest} 的价格差约 `,
    comparisonTrail: '。',
    monthlySuffix: '/月',
  },
  en: {
    button: 'Share price card',
    dialogLabel: 'Share price card',
    close: 'Close dialog',
    global: 'Global',
    cardTitle: (productName) => `${productName} regional prices`,
    planBadge: (planName, referencePrice) => `${planName} plan · US base ${referencePrice}`,
    cheapestRegion: 'Lowest-price region',
    cheaper: 'Cheaper',
    usBase: 'US base',
    moreExpensive: 'More expensive',
    cheapestList: '↓ Cheapest',
    expensiveList: '↑ Most expensive',
    verifiedAt: (date) => `GeoSub · Data verified ${date} · geosub.org`,
    download: 'Download PNG',
    downloading: 'Generating...',
    copyLink: 'Copy link',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    shareText: (planName, low, high, spread) =>
      `${planName} global subscription price comparison: lowest ${low}, highest ${high}, spread ${spread}%.`,
    mapAria: (planName) => `${planName} share map`,
    shareTo: (platform) => `Share to ${platform}`,
    diffAbove: (percent) => `${percent}% more than the US`,
    diffBelow: (percent) => `${percent}% cheaper than the US`,
    diffSame: 'Same as the US',
    comparisonLead: (lowest, highest) =>
      `The price gap between ${lowest} and ${highest} is about `,
    comparisonTrail: '.',
    monthlySuffix: '/mo',
  },
  ja: {
    button: '価格カードを共有',
    dialogLabel: '価格カードを共有',
    close: 'ダイアログを閉じる',
    global: '世界',
    cardTitle: (productName) => `${productName} の地域別価格`,
    planBadge: (planName, referencePrice) =>
      `${planName}プラン・米国基準 ${referencePrice}`,
    cheapestRegion: '最安地域',
    cheaper: '米国より安い',
    usBase: '米国基準',
    moreExpensive: '米国より高い',
    cheapestList: '↓ 最安',
    expensiveList: '↑ 最高',
    verifiedAt: (date) => `GeoSub・データ確認日 ${date}・geosub.org`,
    download: 'PNGをダウンロード',
    downloading: '生成中...',
    copyLink: 'リンクをコピー',
    copied: 'コピーしました',
    copyFailed: 'コピーできませんでした',
    shareText: (planName, low, high, spread) =>
      `${planName}の世界価格比較：最安${low}、最高${high}、価格差${spread}%。`,
    mapAria: (planName) => `${planName}の共有用価格地図`,
    shareTo: (platform) => `${platform}で共有`,
    diffAbove: (percent) => `米国より${percent}%高い`,
    diffBelow: (percent) => `米国より${percent}%安い`,
    diffSame: '米国と同価格',
    comparisonLead: (lowest, highest) =>
      `${lowest}と${highest}の価格差は約`,
    comparisonTrail: 'です。',
    monthlySuffix: '/月',
  },
  ko: {
    button: '가격 카드 공유',
    dialogLabel: '가격 카드 공유',
    close: '대화상자 닫기',
    global: '전 세계',
    cardTitle: (productName) => `${productName} 지역별 가격`,
    planBadge: (planName, referencePrice) =>
      `${planName} 요금제 · 미국 기준 ${referencePrice}`,
    cheapestRegion: '최저가 지역',
    cheaper: '미국보다 저렴',
    usBase: '미국 기준',
    moreExpensive: '미국보다 비쌈',
    cheapestList: '↓ 가장 저렴',
    expensiveList: '↑ 가장 비쌈',
    verifiedAt: (date) => `GeoSub · 데이터 확인일 ${date} · geosub.org`,
    download: 'PNG 다운로드',
    downloading: '생성 중...',
    copyLink: '링크 복사',
    copied: '복사됨',
    copyFailed: '복사하지 못했습니다',
    shareText: (planName, low, high, spread) =>
      `${planName} 전 세계 구독 가격 비교: 최저 ${low}, 최고 ${high}, 가격 차이 ${spread}%.`,
    mapAria: (planName) => `${planName} 공유용 가격 지도`,
    shareTo: (platform) => `${platform}에 공유`,
    diffAbove: (percent) => `미국보다 ${percent}% 비쌈`,
    diffBelow: (percent) => `미국보다 ${percent}% 저렴`,
    diffSame: '미국과 같은 가격',
    comparisonLead: (lowest, highest) =>
      `${lowest}와 ${highest}의 가격 차이는 약 `,
    comparisonTrail: '입니다.',
    monthlySuffix: '/월',
  },
  es: {
    button: 'Compartir tarjeta de precios',
    dialogLabel: 'Compartir tarjeta de precios',
    close: 'Cerrar diálogo',
    global: 'Mundial',
    cardTitle: (productName) => `Precios regionales de ${productName}`,
    planBadge: (planName, referencePrice) =>
      `Plan ${planName} · referencia de EE. UU. ${referencePrice}`,
    cheapestRegion: 'Región con el precio más bajo',
    cheaper: 'Más barato que EE. UU.',
    usBase: 'Referencia de EE. UU.',
    moreExpensive: 'Más caro que EE. UU.',
    cheapestList: '↓ Más baratos',
    expensiveList: '↑ Más caros',
    verifiedAt: (date) => `GeoSub · Datos verificados el ${date} · geosub.org`,
    download: 'Descargar PNG',
    downloading: 'Generando...',
    copyLink: 'Copiar enlace',
    copied: 'Copiado',
    copyFailed: 'No se pudo copiar',
    shareText: (planName, low, high, spread) =>
      `Comparación mundial del plan ${planName}: mínimo ${low}, máximo ${high}, diferencia ${spread}%.`,
    mapAria: (planName) => `Mapa de precios para compartir del plan ${planName}`,
    shareTo: (platform) => `Compartir en ${platform}`,
    diffAbove: (percent) => `${percent}% más que en EE. UU.`,
    diffBelow: (percent) => `${percent}% menos que en EE. UU.`,
    diffSame: 'El mismo precio que en EE. UU.',
    comparisonLead: (lowest, highest) =>
      `La diferencia de precio entre ${lowest} y ${highest} es de aproximadamente `,
    comparisonTrail: '.',
    monthlySuffix: '/mes',
  },
  tr: {
    button: 'Fiyat kartını paylaş',
    dialogLabel: 'Fiyat kartını paylaş',
    close: 'Pencereyi kapat',
    global: 'Dünya geneli',
    cardTitle: (productName) => `${productName} bölgesel fiyatları`,
    planBadge: (planName, referencePrice) =>
      `${planName} paketi · ABD referansı ${referencePrice}`,
    cheapestRegion: 'En düşük fiyatlı bölge',
    cheaper: "ABD'den daha ucuz",
    usBase: 'ABD referansı',
    moreExpensive: "ABD'den daha pahalı",
    cheapestList: '↓ En ucuz bölgeler',
    expensiveList: '↑ En pahalı bölgeler',
    verifiedAt: (date) =>
      `GeoSub · Veriler ${date} tarihinde doğrulandı · geosub.org`,
    download: 'PNG indir',
    downloading: 'Hazırlanıyor...',
    copyLink: 'Bağlantıyı kopyala',
    copied: 'Kopyalandı',
    copyFailed: 'Kopyalanamadı',
    shareText: (planName, low, high, spread) =>
      `${planName} dünya geneli abonelik fiyatları: en düşük ${low}, en yüksek ${high}, fiyat farkı %${spread}.`,
    mapAria: (planName) => `${planName} paylaşım fiyat haritası`,
    shareTo: (platform) => `${platform} üzerinde paylaş`,
    diffAbove: (percent) => `ABD'den %${percent} daha pahalı`,
    diffBelow: (percent) => `ABD'den %${percent} daha ucuz`,
    diffSame: 'ABD ile aynı fiyat',
    comparisonLead: (lowest, highest) =>
      `${lowest} ile ${highest} arasındaki fiyat farkı yaklaşık `,
    comparisonTrail: '.',
    monthlySuffix: '/ay',
  },
  ar: {
    button: 'مشاركة بطاقة الأسعار',
    dialogLabel: 'مشاركة بطاقة الأسعار',
    close: 'إغلاق النافذة',
    global: 'عالمي',
    cardTitle: (productName) => `أسعار ${productName} حسب المنطقة`,
    planBadge: (planName, referencePrice) =>
      `باقة ${planName} · مرجع الولايات المتحدة ${referencePrice}`,
    cheapestRegion: 'المنطقة الأقل سعراً',
    cheaper: 'أقل من الولايات المتحدة',
    usBase: 'مرجع الولايات المتحدة',
    moreExpensive: 'أعلى من الولايات المتحدة',
    cheapestList: '↓ الأقل سعراً',
    expensiveList: '↑ الأعلى سعراً',
    verifiedAt: (date) =>
      `GeoSub · تم التحقق من البيانات في ${date} · geosub.org`,
    download: 'تنزيل PNG',
    downloading: 'جارٍ الإنشاء...',
    copyLink: 'نسخ الرابط',
    copied: 'تم النسخ',
    copyFailed: 'تعذر النسخ',
    shareText: (planName, low, high, spread) =>
      `مقارنة عالمية لأسعار باقة ${planName}: الأدنى ${low}، الأعلى ${high}، وفارق السعر ${spread}٪.`,
    mapAria: (planName) => `خريطة أسعار قابلة للمشاركة لباقة ${planName}`,
    shareTo: (platform) => `المشاركة عبر ${platform}`,
    diffAbove: (percent) => `أعلى من الولايات المتحدة بنسبة ${percent}٪`,
    diffBelow: (percent) => `أقل من الولايات المتحدة بنسبة ${percent}٪`,
    diffSame: 'السعر مماثل للولايات المتحدة',
    comparisonLead: (lowest, highest) =>
      `يبلغ فارق السعر بين ${lowest} و${highest} نحو `,
    comparisonTrail: '.',
    monthlySuffix: '/شهر',
  },
  fr: {
    button: 'Partager la carte des prix', dialogLabel: 'Partager la carte des prix', close: 'Fermer la fenêtre',
    global: 'Monde', cardTitle: (p) => `Prix de ${p} par région`,
    planBadge: (p,r) => `Offre ${p} · référence américaine ${r}`, cheapestRegion: 'Région la moins chère',
    cheaper: 'Moins cher que les États-Unis', usBase: 'Référence américaine', moreExpensive: 'Plus cher que les États-Unis',
    cheapestList: '↓ Les moins chers', expensiveList: '↑ Les plus chers',
    verifiedAt: (d) => `GeoSub · données vérifiées le ${d} · geosub.org`, download: 'Télécharger le PNG',
    downloading: 'Création en cours...', copyLink: 'Copier le lien', copied: 'Lien copié', copyFailed: 'Échec de la copie',
    shareText: (p,l,h,s) => `${p} dans le monde : de ${l} à ${h}, soit un écart de ${s} %.`,
    mapAria: (p) => `Carte partageable des prix de ${p}`, shareTo: (p) => `Partager sur ${p}`,
    diffAbove: (p) => `${p} % plus cher qu’aux États-Unis`, diffBelow: (p) => `${p} % moins cher qu’aux États-Unis`,
    diffSame: 'Même prix qu’aux États-Unis', comparisonLead: (l,h) => `L’écart entre ${l} et ${h} est d’environ `,
    comparisonTrail: '.', monthlySuffix: '/mois',
  },
  it: {
    button: 'Condividi la scheda prezzi', dialogLabel: 'Condividi la scheda prezzi', close: 'Chiudi la finestra',
    global: 'Mondo', cardTitle: (p) => `Prezzi di ${p} per regione`,
    planBadge: (p,r) => `Piano ${p} · riferimento USA ${r}`, cheapestRegion: 'Regione meno cara',
    cheaper: 'Meno caro degli Stati Uniti', usBase: 'Riferimento USA', moreExpensive: 'Più caro degli Stati Uniti',
    cheapestList: '↓ I meno cari', expensiveList: '↑ I più cari',
    verifiedAt: (d) => `GeoSub · dati verificati il ${d} · geosub.org`, download: 'Scarica PNG',
    downloading: 'Creazione in corso...', copyLink: 'Copia link', copied: 'Copiato', copyFailed: 'Copia non riuscita',
    shareText: (p,l,h,s) => `${p} nel mondo: da ${l} a ${h}, con una differenza del ${s}%.`,
    mapAria: (p) => `Mappa condivisibile dei prezzi di ${p}`, shareTo: (p) => `Condividi su ${p}`,
    diffAbove: (p) => `${p}% più caro degli Stati Uniti`, diffBelow: (p) => `${p}% meno caro degli Stati Uniti`,
    diffSame: 'Stesso prezzo degli Stati Uniti', comparisonLead: (l,h) => `La differenza tra ${l} e ${h} è circa `,
    comparisonTrail: '.', monthlySuffix: '/mese',
  },
  de: {
    button: 'Preiskarte teilen', dialogLabel: 'Preiskarte teilen', close: 'Fenster schließen',
    global: 'Weltweit', cardTitle: (p) => `${p}: Preise nach Region`,
    planBadge: (p,r) => `Tarif ${p} · US-Referenz ${r}`, cheapestRegion: 'Günstigste Region',
    cheaper: 'Günstiger als in den USA', usBase: 'US-Referenz', moreExpensive: 'Teurer als in den USA',
    cheapestList: '↓ Am günstigsten', expensiveList: '↑ Am teuersten',
    verifiedAt: (d) => `GeoSub · Daten geprüft am ${d} · geosub.org`, download: 'PNG herunterladen',
    downloading: 'Wird erstellt...', copyLink: 'Link kopieren', copied: 'Kopiert', copyFailed: 'Kopieren fehlgeschlagen',
    shareText: (p,l,h,s) => `${p} weltweit: von ${l} bis ${h}, Preisunterschied ${s} %.`,
    mapAria: (p) => `Teilbare Preiskarte für ${p}`, shareTo: (p) => `Auf ${p} teilen`,
    diffAbove: (p) => `${p} % teurer als in den USA`, diffBelow: (p) => `${p} % günstiger als in den USA`,
    diffSame: 'Gleicher Preis wie in den USA', comparisonLead: (l,h) => `Der Preisunterschied zwischen ${l} und ${h} beträgt etwa `,
    comparisonTrail: '.', monthlySuffix: '/Monat',
  },
  pt: {
    button: 'Partilhar cartão de preços', dialogLabel: 'Partilhar cartão de preços', close: 'Fechar janela',
    global: 'Mundo', cardTitle: (p) => `Preços de ${p} por região`,
    planBadge: (p,r) => `Plano ${p} · referência dos EUA ${r}`, cheapestRegion: 'Região mais barata',
    cheaper: 'Mais barato do que nos EUA', usBase: 'Referência dos EUA', moreExpensive: 'Mais caro do que nos EUA',
    cheapestList: '↓ Mais baratos', expensiveList: '↑ Mais caros',
    verifiedAt: (d) => `GeoSub · dados verificados em ${d} · geosub.org`, download: 'Transferir PNG',
    downloading: 'A criar...', copyLink: 'Copiar ligação', copied: 'Copiado', copyFailed: 'Não foi possível copiar',
    shareText: (p,l,h,s) => `${p} no mundo: de ${l} a ${h}, com uma diferença de ${s}%.`,
    mapAria: (p) => `Mapa partilhável de preços de ${p}`, shareTo: (p) => `Partilhar no ${p}`,
    diffAbove: (p) => `${p}% mais caro do que nos EUA`, diffBelow: (p) => `${p}% mais barato do que nos EUA`,
    diffSame: 'Mesmo preço dos EUA', comparisonLead: (l,h) => `A diferença entre ${l} e ${h} é de cerca de `,
    comparisonTrail: '.', monthlySuffix: '/mês',
  },
} satisfies Record<Exclude<SiteLocale, "zh-tw">, ShareCopy>);
