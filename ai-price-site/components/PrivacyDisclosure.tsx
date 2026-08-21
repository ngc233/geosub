import type { SiteLocale } from "../lib/site-locale";

type DisclosureCopy = {
  updated: string;
  sections: Array<{ title: string; body: string }>;
};

const copy: Record<SiteLocale, DisclosureCopy> = {
  zh: {
    updated: "更新日期：2026 年 8 月 22 日",
    sections: [
      { title: "无标识的页面汇总", body: "为显示全站页面浏览总量，GeoSub 会在不设置或读取 Cookie、也不创建访客或会话标识的情况下，把标准化页面路径直接计入 UTC 每日汇总。应用统计不保存原始 IP、User-Agent、来源页面或单次访问记录；该计数不能识别独立访客，也不能用于点击归因或漏斗分析。" },
      { title: "我们记录什么", body: "在获得所需同意后，GeoSub 可能记录匿名访客标识、会话标识、访问页面、来源页面、点击或交互类型、时间、浏览器与设备类别，以及用于理解该次交互的有限技术信息。公开浏览不要求姓名、身份证件、支付资料或 Apple 账号信息。" },
      { title: "为什么记录", body: "这些数据用于维持安全与稳定、发现故障、统计内容使用情况，并改进价格页面和导航。我们不会把分析数据用于判断个人信用，也不会出售可识别个人身份的信息。" },
      { title: "同意、第三方与保存期", body: "带有访客或会话标识的第一方行为分析，以及 Google Analytics 或 Google Tag Manager，只会在你选择接受后运行；Google 会按其政策处理收到的数据。这些第一方原始分析事件默认最多保存 180 天，之后删除或仅保留汇总统计。上方无标识的每日页面汇总是独立计数，不会启用这些工具。" },
      { title: "你的选择", body: "你可以拒绝或随时重新打开页尾的分析设置。拒绝后，GeoSub 会停止非必要分析并清除本站分析会话。需要查询、更正或删除与浏览器标识有关的数据时，请通过网站联系页面提交请求。" },
    ],
  },
  "zh-tw": {
    updated: "更新日期：2026 年 8 月 22 日",
    sections: [
      { title: "無識別碼的頁面彙總", body: "為顯示全站頁面瀏覽總量，GeoSub 不會設定或讀取 Cookie，也不會建立訪客或工作階段識別碼，而只將標準化頁面路徑直接計入 UTC 每日彙總。應用程式統計不保存原始 IP、User-Agent、來源頁面或單次瀏覽記錄；此計數無法識別獨立訪客，也不會用於點擊歸因或漏斗分析。" },
      { title: "我們記錄哪些資料", body: "在取得必要同意後，GeoSub 可能記錄匿名訪客識別碼、工作階段識別碼、瀏覽頁面、來源頁面、點擊或互動類型、時間、瀏覽器與裝置類別，以及理解該次互動所需的有限技術資訊。公開瀏覽不要求姓名、身分證件、付款資料或 Apple 帳號資訊。" },
      { title: "使用目的", body: "這些資料用於維持網站安全與穩定、發現錯誤、瞭解內容使用情況，以及改善價格頁面與導覽。我們不會以分析資料評估個人信用，也不會出售可識別個人身分的資訊。" },
      { title: "同意、第三方與保存期間", body: "帶有訪客或工作階段識別碼的第一方行為分析，以及 Google Analytics 或 Google Tag Manager，只會在你選擇接受後執行；Google 會依其政策處理收到的資料。這些第一方原始分析事件預設最多保存 180 天，之後刪除或僅保留彙總統計。上方無識別碼的每日頁面彙總是獨立計數，不會啟用這些工具。" },
      { title: "你的選擇", body: "你可以拒絕分析，或隨時重新開啟頁尾的分析設定。拒絕後，GeoSub 會停止非必要分析並清除本站分析工作階段。如需查詢、更正或刪除與瀏覽器識別碼相關的資料，請透過網站聯絡頁提出要求。" },
    ],
  },
  en: {
    updated: "Last updated: 22 August 2026",
    sections: [
      { title: "Page totals without identifiers", body: "To show total site page views, GeoSub adds the normalized page path directly to a UTC daily aggregate without setting or reading cookies or creating visitor or session identifiers. The application statistics do not retain raw IP addresses, user agents, referrers, or individual visit records. This count cannot identify unique visitors and is not used for click attribution or funnel analysis." },
      { title: "Data we record", body: "After any required consent, GeoSub may record an anonymous visitor ID, session ID, page and referrer, interaction type, timestamp, browser and device category, and limited technical context needed to understand the event. Public browsing does not require a name, identity document, payment details, or Apple account information." },
      { title: "Why we use it", body: "We use this information to protect reliability and security, diagnose failures, understand which content is useful, and improve pricing pages and navigation. We do not use analytics to assess personal credit and do not sell personally identifiable information." },
      { title: "Consent, providers, and retention", body: "First-party behavioural analytics with visitor or session identifiers, and Google Analytics or Google Tag Manager, run only after you accept; Google processes received data under its own policies. GeoSub retains those first-party raw analytics events for up to 180 days by default, then deletes them or keeps only aggregated statistics. The identifier-free daily page total above is a separate counter and does not enable those tools." },
      { title: "Your choices", body: "You may reject analytics or reopen analytics settings from the footer at any time. When rejected, GeoSub stops non-essential analytics and clears its analytics session. Use the site contact page to request access, correction, or deletion of data associated with a browser identifier." },
    ],
  },
  ja: {
    updated: "最終更新日：2026年8月22日",
    sections: [
      { title: "識別子を使わないページ集計", body: "サイト全体のページ閲覧数を表示するため、GeoSub は Cookie の設定・読み取りや訪問者・セッション ID の作成を行わず、正規化したページパスだけを UTC 日次集計へ直接加算します。アプリケーション統計には生の IP、User-Agent、参照元、個別の訪問記録を保存しません。この数値はユニーク訪問者の識別、クリックの帰属、ファネル分析には使用できません。" },
      { title: "記録する情報", body: "必要な同意を得た後、匿名の訪問者ID、セッションID、閲覧ページ、参照元、操作の種類、時刻、ブラウザー・端末区分、操作を理解するための限定的な技術情報を記録することがあります。閲覧に氏名、本人確認書類、決済情報、Appleアカウント情報は不要です。" },
      { title: "利用目的", body: "安全性と安定性の確保、不具合の診断、利用されるコンテンツの把握、料金ページやナビゲーションの改善に使用します。分析情報を個人の信用評価に用いたり、個人を特定できる情報を販売したりしません。" },
      { title: "同意・外部サービス・保存期間", body: "訪問者・セッション識別子を使う自社の行動分析と Google Analytics または Google Tag Manager は、同意後にのみ実行されます。Google は受領したデータを同社の方針に従って処理します。自社の生の分析イベントは原則180日以内に削除するか、集計情報のみを残します。上記の識別子を使わない日次ページ集計は独立した計数であり、これらのツールを有効にしません。" },
      { title: "選択とお問い合わせ", body: "分析を拒否したり、フッターからいつでも設定を開き直したりできます。拒否時は不要な分析を停止し、分析セッションを消去します。ブラウザー識別子に関連するデータの照会・訂正・削除は、お問い合わせページからご連絡ください。" },
    ],
  },
  ko: {
    updated: "최종 업데이트: 2026년 8월 22일",
    sections: [
      { title: "식별자 없는 페이지 집계", body: "사이트 전체 페이지 조회수를 표시하기 위해 GeoSub는 쿠키를 설정하거나 읽지 않고 방문자 또는 세션 ID도 만들지 않으며, 정규화된 페이지 경로만 UTC 일별 합계에 직접 더합니다. 애플리케이션 통계에는 원본 IP, User-Agent, 유입 경로 또는 개별 방문 기록을 저장하지 않습니다. 이 수치는 순 방문자 식별, 클릭 기여 또는 퍼널 분석에 사용할 수 없습니다." },
      { title: "수집하는 정보", body: "필요한 동의를 받은 뒤 익명 방문자 ID, 세션 ID, 방문 페이지와 유입 경로, 상호작용 유형, 시각, 브라우저·기기 범주 및 해당 상호작용을 이해하는 데 필요한 제한된 기술 정보를 기록할 수 있습니다. 공개 페이지 이용에 이름, 신분증, 결제 정보 또는 Apple 계정 정보는 필요하지 않습니다." },
      { title: "이용 목적", body: "보안과 안정성 유지, 오류 진단, 유용한 콘텐츠 파악, 가격 페이지와 탐색 기능 개선에 사용합니다. 분석 정보를 개인 신용 평가에 사용하지 않으며 개인을 식별할 수 있는 정보를 판매하지 않습니다." },
      { title: "동의, 외부 서비스 및 보관", body: "방문자 또는 세션 식별자를 사용하는 자체 행동 분석과 Google Analytics 또는 Google Tag Manager는 동의한 뒤에만 실행됩니다. Google은 자체 정책에 따라 수신 데이터를 처리합니다. 자체 원시 분석 이벤트는 기본적으로 최대 180일 보관한 뒤 삭제하거나 집계 통계만 남깁니다. 위의 식별자 없는 일별 페이지 합계는 별도 카운터이며 이러한 도구를 활성화하지 않습니다." },
      { title: "이용자의 선택", body: "분석을 거부하거나 언제든지 푸터에서 설정을 다시 열 수 있습니다. 거부하면 불필요한 분석을 중단하고 분석 세션을 삭제합니다. 브라우저 식별자와 연결된 데이터의 열람·정정·삭제 요청은 문의 페이지를 이용해 주세요." },
    ],
  },
  es: {
    updated: "Última actualización: 22 de agosto de 2026",
    sections: [
      { title: "Totales de páginas sin identificadores", body: "Para mostrar el total de páginas vistas, GeoSub suma la ruta normalizada directamente a un agregado diario UTC sin crear ni leer cookies ni identificadores de visitante o sesión. Las estadísticas de la aplicación no conservan direcciones IP sin tratar, agentes de usuario, referencias ni registros de visitas individuales. Este recuento no identifica visitantes únicos ni sirve para atribución de clics o análisis de embudos." },
      { title: "Datos que registramos", body: "Tras obtener el consentimiento necesario, GeoSub puede registrar un identificador anónimo de visitante y de sesión, la página visitada y de referencia, el tipo de interacción, la hora, la categoría de navegador y dispositivo y un contexto técnico limitado. Para navegar no pedimos nombre, documento de identidad, datos de pago ni información de la cuenta de Apple." },
      { title: "Para qué los utilizamos", body: "Los utilizamos para proteger la seguridad y la estabilidad, diagnosticar fallos, saber qué contenido resulta útil y mejorar las páginas de precios y la navegación. No empleamos la analítica para evaluar el crédito personal ni vendemos información que identifique a una persona." },
      { title: "Consentimiento, proveedores y conservación", body: "La analítica propia de comportamiento con identificadores de visitante o sesión, así como Google Analytics o Google Tag Manager, solo funciona después de aceptarla; Google trata los datos recibidos conforme a sus políticas. GeoSub conserva esos eventos analíticos propios sin agregar durante un máximo predeterminado de 180 días y después los elimina o conserva solo estadísticas agregadas. El total diario sin identificadores descrito arriba es independiente y no activa esas herramientas." },
      { title: "Tus opciones", body: "Puedes rechazar la analítica o volver a abrir su configuración desde el pie de página. Al rechazarla, GeoSub detiene la analítica no esencial y borra la sesión analítica. Utiliza la página de contacto para solicitar acceso, rectificación o supresión de datos asociados a un identificador del navegador." },
    ],
  },
  tr: {
    updated: "Son güncelleme: 22 Ağustos 2026",
    sections: [
      { title: "Tanımlayıcı içermeyen sayfa toplamları", body: "GeoSub, site genelindeki toplam sayfa görüntülemelerini göstermek için çerez ayarlamadan veya okumadan ve ziyaretçi ya da oturum kimliği oluşturmadan normalleştirilmiş sayfa yolunu doğrudan UTC günlük toplamına ekler. Uygulama istatistikleri ham IP adreslerini, User-Agent bilgisini, yönlendiren sayfayı veya tekil ziyaret kayıtlarını saklamaz. Bu sayı benzersiz ziyaretçileri belirleyemez; tıklama ilişkilendirmesi veya dönüşüm hunisi analizi için kullanılmaz." },
      { title: "Kaydettiğimiz veriler", body: "Gerekli onay alındıktan sonra anonim ziyaretçi ve oturum kimliği, görüntülenen sayfa, yönlendiren sayfa, etkileşim türü, zaman, tarayıcı ve cihaz kategorisi ile olayı anlamak için gereken sınırlı teknik bağlam kaydedilebilir. Gezinmek için ad, kimlik belgesi, ödeme bilgisi veya Apple hesabı bilgisi istenmez." },
      { title: "Kullanım amacı", body: "Bu verileri güvenlik ve kararlılığı korumak, hataları teşhis etmek, yararlı içerikleri anlamak ve fiyat sayfalarıyla gezinmeyi iyileştirmek için kullanırız. Analiz verileri kişisel kredi değerlendirmesinde kullanılmaz ve kişiyi tanımlayan bilgiler satılmaz." },
      { title: "Onay, sağlayıcılar ve saklama", body: "Ziyaretçi veya oturum kimliği kullanan birinci taraf davranış analizi ile Google Analytics veya Google Tag Manager yalnızca kabulden sonra çalışır; Google aldığı verileri kendi politikalarına göre işler. GeoSub bu birinci taraf ham analiz olaylarını varsayılan olarak en fazla 180 gün saklar, ardından siler veya yalnızca toplu istatistikleri korur. Yukarıdaki tanımlayıcı içermeyen günlük sayfa toplamı ayrı bir sayaçtır ve bu araçları etkinleştirmez." },
      { title: "Seçimleriniz", body: "Analizi reddedebilir veya alt bilgideki ayarları dilediğiniz zaman yeniden açabilirsiniz. Reddettiğinizde gerekli olmayan analiz durdurulur ve analiz oturumu temizlenir. Tarayıcı kimliğiyle ilişkili verilere erişim, düzeltme veya silme talepleri için iletişim sayfasını kullanın." },
    ],
  },
  ar: {
    updated: "آخر تحديث: 22 أغسطس 2026",
    sections: [
      { title: "إجمالي الصفحات دون معرّفات", body: "لعرض إجمالي مشاهدات صفحات الموقع، يضيف GeoSub مسار الصفحة الموحّد مباشرة إلى إجمالي يومي بتوقيت UTC من دون تعيين ملفات تعريف الارتباط أو قراءتها ومن دون إنشاء معرّف للزائر أو الجلسة. لا تحتفظ إحصاءات التطبيق بعناوين IP الخام أو وكيل المستخدم أو الصفحة المُحيلة أو سجلات الزيارات الفردية. لا يحدد هذا العدد الزوار الفريدين ولا يُستخدم لإسناد النقرات أو تحليل مسار التحويل." },
      { title: "البيانات التي نسجلها", body: "بعد الحصول على الموافقة المطلوبة، قد يسجل GeoSub معرّفاً مجهولاً للزائر والجلسة، والصفحة التي تمت زيارتها والصفحة المُحيلة، ونوع التفاعل ووقته، وفئة المتصفح والجهاز، وسياقاً تقنياً محدوداً لفهم الحدث. لا يتطلب التصفح اسماً أو وثيقة هوية أو بيانات دفع أو معلومات حساب Apple." },
      { title: "أغراض الاستخدام", body: "نستخدم هذه البيانات لحماية الأمان والاستقرار، وتشخيص الأعطال، وفهم المحتوى المفيد، وتحسين صفحات الأسعار والتنقل. لا نستخدم التحليلات لتقييم الجدارة الائتمانية الشخصية ولا نبيع معلومات تحدد هوية الأفراد." },
      { title: "الموافقة ومقدمو الخدمة والاحتفاظ", body: "لا تعمل تحليلات السلوك الخاصة بالطرف الأول التي تستخدم معرّف الزائر أو الجلسة، ولا Google Analytics أو Google Tag Manager، إلا بعد قبولك؛ وتعالج Google البيانات وفق سياساتها. يحتفظ GeoSub بهذه الأحداث الأولية لمدة افتراضية لا تتجاوز 180 يوماً، ثم يحذفها أو يبقي الإحصاءات المجمعة فقط. إجمالي الصفحات اليومي دون معرّفات الموضح أعلاه عداد مستقل ولا يفعّل هذه الأدوات." },
      { title: "خياراتك", body: "يمكنك رفض التحليلات أو إعادة فتح إعداداتها من تذييل الموقع في أي وقت. عند الرفض، تتوقف التحليلات غير الضرورية وتُمسح جلسة التحليل. استخدم صفحة الاتصال لطلب الوصول إلى البيانات المرتبطة بمعرّف المتصفح أو تصحيحها أو حذفها." },
    ],
  },
  fr: {
    updated: "Dernière mise à jour : 22 août 2026",
    sections: [
      { title: "Totaux de pages sans identifiants", body: "Pour afficher le total des pages vues sur le site, GeoSub ajoute directement le chemin normalisé de la page à un agrégat quotidien UTC, sans déposer ni lire de cookie et sans créer d’identifiant de visiteur ou de session. Les statistiques de l’application ne conservent ni adresse IP brute, ni User-Agent, ni provenance, ni visite individuelle. Ce compteur ne permet pas d’identifier les visiteurs uniques et ne sert ni à l’attribution des clics ni à l’analyse de parcours." },
      { title: "Données enregistrées", body: "Après obtention du consentement requis, GeoSub peut enregistrer un identifiant anonyme de visiteur et de session, la page consultée et la provenance, le type d’interaction, l’heure, la catégorie de navigateur et d’appareil, ainsi qu’un contexte technique limité. La consultation ne nécessite ni nom, ni pièce d’identité, ni données de paiement, ni informations de compte Apple." },
      { title: "Finalités", body: "Ces données servent à protéger la sécurité et la stabilité, diagnostiquer les incidents, comprendre les contenus utiles et améliorer les pages de prix et la navigation. Nous ne les utilisons pas pour évaluer la solvabilité d’une personne et ne vendons aucune information permettant de l’identifier." },
      { title: "Consentement, prestataires et conservation", body: "L’analyse comportementale de première partie utilisant un identifiant de visiteur ou de session, ainsi que Google Analytics ou Google Tag Manager, ne fonctionne qu’après acceptation ; Google traite les données reçues selon ses propres règles. GeoSub conserve ces événements bruts pendant 180 jours au maximum, puis les supprime ou ne garde que des statistiques agrégées. Le total quotidien sans identifiants décrit ci-dessus est un compteur distinct et n’active pas ces outils." },
      { title: "Vos choix", body: "Vous pouvez refuser l’analyse ou rouvrir ses réglages depuis le pied de page. En cas de refus, GeoSub arrête les mesures non essentielles et efface la session d’analyse. Utilisez la page de contact pour demander l’accès, la rectification ou la suppression de données associées à un identifiant de navigateur." },
    ],
  },
  it: {
    updated: "Ultimo aggiornamento: 22 agosto 2026",
    sections: [
      { title: "Totali delle pagine senza identificatori", body: "Per mostrare il totale delle visualizzazioni del sito, GeoSub aggiunge il percorso normalizzato della pagina direttamente a un aggregato giornaliero UTC senza impostare o leggere cookie e senza creare identificatori del visitatore o della sessione. Le statistiche dell’applicazione non conservano indirizzi IP grezzi, User-Agent, provenienza o singole visite. Questo conteggio non identifica i visitatori unici e non viene usato per attribuire clic o analizzare il funnel." },
      { title: "Dati registrati", body: "Dopo l’eventuale consenso richiesto, GeoSub può registrare un identificatore anonimo del visitatore e della sessione, la pagina visitata e quella di provenienza, il tipo di interazione, l’ora, la categoria di browser e dispositivo e un contesto tecnico limitato. La consultazione non richiede nome, documento d’identità, dati di pagamento o informazioni dell’account Apple." },
      { title: "Finalità", body: "Usiamo questi dati per proteggere sicurezza e stabilità, diagnosticare problemi, capire quali contenuti sono utili e migliorare pagine dei prezzi e navigazione. Non impieghiamo l’analisi per valutare il credito personale e non vendiamo informazioni che identificano una persona." },
      { title: "Consenso, fornitori e conservazione", body: "L’analisi comportamentale di prima parte con identificatori del visitatore o della sessione, e Google Analytics o Google Tag Manager, si attivano solo dopo l’accettazione; Google tratta i dati ricevuti secondo le proprie politiche. GeoSub conserva questi eventi grezzi per un massimo di 180 giorni, poi li elimina o mantiene solo statistiche aggregate. Il totale giornaliero senza identificatori descritto sopra è un contatore separato e non attiva questi strumenti." },
      { title: "Le tue scelte", body: "Puoi rifiutare l’analisi o riaprirne le impostazioni dal piè di pagina in qualsiasi momento. In caso di rifiuto, GeoSub interrompe l’analisi non essenziale e cancella la sessione analitica. Usa la pagina di contatto per chiedere accesso, rettifica o cancellazione dei dati associati a un identificatore del browser." },
    ],
  },
  de: {
    updated: "Zuletzt aktualisiert: 22. August 2026",
    sections: [
      { title: "Seitenzahlen ohne Kennungen", body: "Um die gesamten Seitenaufrufe der Website anzuzeigen, addiert GeoSub den normalisierten Seitenpfad direkt zu einer täglichen UTC-Summe, ohne Cookies zu setzen oder auszulesen und ohne Besucher- oder Sitzungskennungen zu erstellen. Die Anwendungsstatistik speichert keine rohen IP-Adressen, User-Agents, Referrer oder einzelnen Besuche. Diese Zahl identifiziert keine eindeutigen Besucher und wird weder zur Klickzuordnung noch zur Funnel-Analyse verwendet." },
      { title: "Erfasste Daten", body: "Nach einer gegebenenfalls erforderlichen Einwilligung kann GeoSub eine anonyme Besucher- und Sitzungskennung, besuchte Seite und Herkunft, Art und Zeitpunkt der Interaktion, Browser- und Gerätekategorie sowie begrenzte technische Kontextdaten erfassen. Für die öffentliche Nutzung sind weder Name noch Ausweisdaten, Zahlungsangaben oder Apple-Kontoinformationen erforderlich." },
      { title: "Verwendungszwecke", body: "Wir nutzen diese Daten, um Sicherheit und Stabilität zu schützen, Fehler zu untersuchen, nützliche Inhalte zu erkennen und Preisseiten sowie Navigation zu verbessern. Analysedaten werden nicht zur persönlichen Bonitätsprüfung eingesetzt; personenbezogene Informationen werden nicht verkauft." },
      { title: "Einwilligung, Anbieter und Speicherdauer", body: "Eigene Verhaltensanalysen mit Besucher- oder Sitzungskennungen sowie Google Analytics oder Google Tag Manager starten erst nach Zustimmung; Google verarbeitet empfangene Daten nach eigenen Richtlinien. GeoSub speichert diese eigenen rohen Analyseereignisse standardmäßig höchstens 180 Tage und löscht sie anschließend oder bewahrt nur aggregierte Statistiken auf. Die oben beschriebene tägliche Seitenzahl ohne Kennungen ist ein separater Zähler und aktiviert diese Werkzeuge nicht." },
      { title: "Ihre Wahlmöglichkeiten", body: "Sie können die Analyse ablehnen oder die Einstellungen jederzeit im Footer erneut öffnen. Bei Ablehnung stoppt GeoSub nicht erforderliche Analysen und löscht die Analysesitzung. Über die Kontaktseite können Sie Auskunft, Berichtigung oder Löschung von Daten verlangen, die einer Browserkennung zugeordnet sind." },
    ],
  },
  pt: {
    updated: "Última atualização: 22 de agosto de 2026",
    sections: [
      { title: "Totais de páginas sem identificadores", body: "Para apresentar o total de visualizações do site, o GeoSub adiciona diretamente o caminho normalizado da página a um agregado diário UTC, sem definir ou ler cookies e sem criar identificadores de visitante ou sessão. As estatísticas da aplicação não conservam endereços IP em bruto, User-Agent, referências ou visitas individuais. Esta contagem não identifica visitantes únicos e não é usada para atribuição de cliques nem análise de funil." },
      { title: "Dados registados", body: "Depois de obtido o consentimento necessário, o GeoSub pode registar um identificador anónimo de visitante e sessão, a página visitada e a origem, o tipo e a hora da interação, a categoria do navegador e dispositivo e um contexto técnico limitado. A consulta pública não exige nome, documento de identificação, dados de pagamento ou informações da conta Apple." },
      { title: "Finalidades", body: "Usamos estes dados para proteger a segurança e estabilidade, diagnosticar falhas, compreender os conteúdos úteis e melhorar páginas de preços e navegação. Não utilizamos a análise para avaliar o crédito pessoal nem vendemos informações que identifiquem uma pessoa." },
      { title: "Consentimento, fornecedores e conservação", body: "A análise comportamental própria com identificadores de visitante ou sessão, assim como o Google Analytics ou Google Tag Manager, só funciona depois da aceitação; a Google trata os dados recebidos segundo as suas políticas. O GeoSub conserva esses eventos brutos próprios durante um máximo de 180 dias e depois elimina-os ou mantém apenas estatísticas agregadas. O total diário sem identificadores descrito acima é um contador separado e não ativa essas ferramentas." },
      { title: "As suas escolhas", body: "Pode recusar a análise ou reabrir as definições no rodapé a qualquer momento. Quando recusa, o GeoSub interrompe a análise não essencial e limpa a sessão analítica. Use a página de contacto para pedir acesso, retificação ou eliminação de dados associados a um identificador do navegador." },
    ],
  },
};

export default function PrivacyDisclosure({ locale }: { locale: SiteLocale }) {
  const text = copy[locale];

  return (
    <section className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
      <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500">
        {text.updated}
      </p>
      <div className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-2">
        {text.sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-base font-black text-zinc-950 dark:text-white">
              {section.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              {section.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
