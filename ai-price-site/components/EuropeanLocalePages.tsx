import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { SiteLocale } from "../lib/site-locale";

type EuropeanLocale = Extract<SiteLocale, "fr" | "it" | "de" | "pt">;
type InfoKey =
  | "about"
  | "data-sources"
  | "privacy"
  | "terms"
  | "guides"
  | "guides/price-guide"
  | "guides/payment-account"
  | "guides/methodology";

type PageText = {
  eyebrow: string;
  title: string;
  description: string;
  heading: string;
  paragraphs: string[];
};

const copy: Record<
  EuropeanLocale,
  {
    home: {
      eyebrow: string;
      title: string;
      description: string;
      view: string;
      sections: Array<{ title: string; description: string; href: string; tag: string }>;
    };
    pages: Record<InfoKey, PageText>;
  }
> = {
  fr: {
    home: {
      eyebrow: "Prix des abonnements numériques dans le monde",
      title: "Les prix mondiaux des abonnements, au même endroit",
      description: "GeoSub compare les services d’IA et de streaming selon les pays. Consultez le prix local, sa conversion dans la devise choisie, les taxes et le pouvoir d’achat.",
      view: "Découvrir",
      sections: [
        { title: "Abonnements IA", description: "Comparez ChatGPT, Claude, Gemini, Grok et d’autres services selon le pays.", href: "/fr/ai-pricing/", tag: "IA" },
        { title: "Streaming", description: "Consultez les écarts régionaux de Netflix, Disney+ et d’autres plateformes.", href: "/fr/streaming-pricing/", tag: "Streaming" },
        { title: "Sources des données", description: "Découvrez l’origine des prix, des taux de change et des informations fiscales.", href: "/fr/data-sources/", tag: "Données" },
        { title: "Guides", description: "Apprenez à interpréter les prix régionaux et les conditions de paiement.", href: "/fr/guides/", tag: "Guides" },
      ],
    },
    pages: {
      about: { eyebrow: "À propos", title: "À propos de GeoSub", description: "Une lecture claire des écarts de prix des abonnements numériques.", heading: "Notre mission", paragraphs: ["Un même service peut coûter différemment selon le pays, la monnaie, les taxes et la plateforme. GeoSub rassemble des prix régionaux vérifiés selon une méthode commune.", "Chaque prix indique ses dates de collecte et de change, sa situation fiscale et son niveau de fiabilité. Le montant final doit toujours être confirmé sur la page de paiement officielle."] },
      "data-sources": { eyebrow: "Sources des données", title: "D’où viennent les prix ?", description: "Comprendre les sources utilisées par GeoSub et leur processus de vérification.", heading: "Des données traçables", paragraphs: ["Les classements publics utilisent les prix d’abonnement régionaux vérifiés de l’App Store, avec la devise locale et la date de collecte.", "Les taux de change servent uniquement à la comparaison. Les informations fiscales donnent du contexte ; le montant affiché au paiement par la plateforme reste la référence finale."] },
      privacy: { eyebrow: "Confidentialité", title: "Politique de confidentialité", description: "Les principes appliqués par GeoSub aux données des visiteurs.", heading: "Une collecte limitée", paragraphs: ["GeoSub peut enregistrer des mesures techniques et statistiques nécessaires au fonctionnement, à la sécurité et à l’amélioration du site.", "Google Analytics ou Google Tag Manager peuvent mesurer les pages consultées, les interactions générales et les performances. Ces mesures servent à améliorer le contenu et la fiabilité, sans demander de données de paiement ni d’identité sensibles."] },
      terms: { eyebrow: "Conditions", title: "Conditions d’utilisation", description: "Les règles d’utilisation des données et comparatifs GeoSub.", heading: "Un service d’information", paragraphs: ["GeoSub fournit des comparaisons à titre informatif. Les prix, taxes, taux de change et disponibilités peuvent évoluer sans préavis.", "GeoSub ne garantit pas qu’un abonnement soit accessible depuis une autre région et n’encourage pas le contournement des règles des plateformes."] },
      guides: { eyebrow: "Guides", title: "Bien comprendre les abonnements régionaux", description: "Des repères pratiques pour lire les prix, les taxes et les conditions de paiement.", heading: "Choisir un guide", paragraphs: ["Le guide des prix explique les écarts régionaux. Le guide paiement et compte présente les contraintes courantes. La méthodologie détaille la collecte et la vérification.", "Les guides complètent les tableaux de prix sans remplacer les conditions officielles du fournisseur."] },
      "guides/price-guide": { eyebrow: "Guide des prix", title: "Lire un comparatif de prix régional", description: "Comprendre le prix local, la devise d’affichage et l’écart avec la référence.", heading: "Comparer des valeurs cohérentes", paragraphs: ["Commencez par le prix local et sa date de collecte, puis consultez la conversion dans la devise choisie et la date du taux de change.", "Un prix plus bas ne garantit pas l’accès à l’offre. Les taxes, le pays du compte et le moyen de paiement restent déterminants."] },
      "guides/payment-account": { eyebrow: "Paiement et compte", title: "Vérifier son compte avant de s’abonner", description: "Pays du compte, moyen de paiement et facturation peuvent limiter un achat régional.", heading: "Avant le paiement", paragraphs: ["Vérifiez la disponibilité locale, le pays de votre compte, les moyens de paiement acceptés et l’adresse de facturation demandée.", "Ne fournissez pas de fausses informations. Le prix et l’éligibilité définitifs apparaissent sur la page de paiement officielle."] },
      "guides/methodology": { eyebrow: "Méthodologie", title: "Comment GeoSub vérifie les prix", description: "De la collecte régionale à la publication d’un prix stable.", heading: "Collecter, contrôler, publier", paragraphs: ["Les observations sont rapprochées d’une offre canonique, contrôlées pour la devise et la période de facturation, puis comparées aux relevés précédents.", "Les valeurs incohérentes sont isolées. Seuls les prix suffisamment stables et vérifiés alimentent les pages publiques."] },
    },
  },
  it: {
    home: {
      eyebrow: "Prezzi degli abbonamenti digitali nel mondo", title: "I prezzi globali degli abbonamenti, in un solo posto",
      description: "GeoSub confronta servizi IA e streaming tra paesi. Consulta prezzo locale, conversione nella valuta scelta, imposte e potere d’acquisto.", view: "Scopri",
      sections: [
        { title: "Abbonamenti IA", description: "Confronta ChatGPT, Claude, Gemini, Grok e altri servizi per paese.", href: "/it/ai-pricing/", tag: "IA" },
        { title: "Streaming", description: "Consulta le differenze regionali di Netflix, Disney+ e altre piattaforme.", href: "/it/streaming-pricing/", tag: "Streaming" },
        { title: "Fonti dei dati", description: "Scopri l’origine di prezzi, cambi e informazioni fiscali.", href: "/it/data-sources/", tag: "Dati" },
        { title: "Guide", description: "Impara a interpretare prezzi regionali e condizioni di pagamento.", href: "/it/guides/", tag: "Guide" },
      ],
    },
    pages: {
      about: { eyebrow: "Informazioni", title: "Informazioni su GeoSub", description: "Un modo chiaro per leggere le differenze di prezzo degli abbonamenti digitali.", heading: "Il nostro obiettivo", paragraphs: ["Lo stesso servizio può avere prezzi diversi per paese, valuta, imposte e piattaforma. GeoSub organizza prezzi regionali verificati con un metodo comune.", "Ogni prezzo mostra date di raccolta e cambio, contesto fiscale e affidabilità. Verifica sempre l’importo finale nella pagina di pagamento ufficiale."] },
      "data-sources": { eyebrow: "Fonti dei dati", title: "Da dove provengono i prezzi?", description: "Le fonti usate da GeoSub e il modo in cui vengono verificate.", heading: "Dati tracciabili", paragraphs: ["Le classifiche pubbliche usano prezzi regionali App Store verificati, con valuta locale e data di raccolta.", "I cambi servono al confronto. Le informazioni fiscali forniscono contesto; fa sempre fede il prezzo mostrato dalla piattaforma al pagamento."] },
      privacy: { eyebrow: "Privacy", title: "Informativa sulla privacy", description: "I principi applicati da GeoSub ai dati dei visitatori.", heading: "Raccolta limitata", paragraphs: ["GeoSub può registrare dati tecnici e statistici necessari per funzionamento, sicurezza e miglioramento del sito.", "Google Analytics o Google Tag Manager possono misurare visualizzazioni, interazioni generali e prestazioni. Questi dati servono a migliorare contenuti e affidabilità, senza richiedere dati di pagamento o informazioni sensibili sull’identità."] },
      terms: { eyebrow: "Termini", title: "Termini di utilizzo", description: "Le regole per usare dati e confronti GeoSub.", heading: "Un servizio informativo", paragraphs: ["GeoSub fornisce confronti a scopo informativo. Prezzi, imposte, cambi e disponibilità possono cambiare senza preavviso.", "GeoSub non garantisce l’accesso a un abbonamento da un’altra regione e non incoraggia ad aggirare le regole delle piattaforme."] },
      guides: { eyebrow: "Guide", title: "Capire gli abbonamenti regionali", description: "Indicazioni pratiche per leggere prezzi, imposte e condizioni di pagamento.", heading: "Scegli una guida", paragraphs: ["La guida ai prezzi spiega le differenze regionali; la guida a pagamenti e account illustra i vincoli comuni; la metodologia descrive raccolta e verifica.", "Le guide completano le tabelle senza sostituire le condizioni ufficiali del fornitore."] },
      "guides/price-guide": { eyebrow: "Guida ai prezzi", title: "Leggere un confronto regionale", description: "Capire prezzo locale, valuta selezionata e differenza dal riferimento.", heading: "Confrontare valori coerenti", paragraphs: ["Parti dal prezzo locale e dalla data di raccolta, poi controlla la conversione nella valuta scelta e la data del cambio.", "Un prezzo inferiore non garantisce l’accesso: imposte, paese dell’account e metodo di pagamento restano determinanti."] },
      "guides/payment-account": { eyebrow: "Pagamenti e account", title: "Controllare l’account prima di abbonarsi", description: "Paese dell’account, pagamento e fatturazione possono limitare un acquisto regionale.", heading: "Prima del pagamento", paragraphs: ["Verifica disponibilità locale, paese dell’account, metodi di pagamento accettati e indirizzo di fatturazione richiesto.", "Non usare informazioni false. Prezzo e idoneità definitivi compaiono nella pagina di pagamento ufficiale."] },
      "guides/methodology": { eyebrow: "Metodologia", title: "Come GeoSub verifica i prezzi", description: "Dalla raccolta regionale alla pubblicazione di un prezzo stabile.", heading: "Raccogliere, controllare, pubblicare", paragraphs: ["Le osservazioni vengono associate a un piano canonico, controllate per valuta e periodo di fatturazione e confrontate con i rilevamenti precedenti.", "I valori incoerenti vengono isolati. Solo prezzi sufficientemente stabili e verificati alimentano le pagine pubbliche."] },
    },
  },
  de: {
    home: {
      eyebrow: "Digitale Abonnementpreise weltweit", title: "Weltweite Abonnementpreise an einem Ort",
      description: "GeoSub vergleicht KI- und Streaming-Dienste nach Land. Sehen Sie lokale Preise, die gewählte Anzeigewährung, Steuern und Kaufkraft.", view: "Ansehen",
      sections: [
        { title: "KI-Abonnements", description: "Vergleichen Sie ChatGPT, Claude, Gemini, Grok und weitere Dienste nach Land.", href: "/de/ai-pricing/", tag: "KI" },
        { title: "Streaming", description: "Sehen Sie regionale Unterschiede bei Netflix, Disney+ und weiteren Plattformen.", href: "/de/streaming-pricing/", tag: "Streaming" },
        { title: "Datenquellen", description: "Erfahren Sie, woher Preise, Wechselkurse und Steuerangaben stammen.", href: "/de/data-sources/", tag: "Daten" },
        { title: "Ratgeber", description: "Lernen Sie, regionale Preise und Zahlungsbedingungen richtig einzuordnen.", href: "/de/guides/", tag: "Ratgeber" },
      ],
    },
    pages: {
      about: { eyebrow: "Über uns", title: "Über GeoSub", description: "Preisunterschiede digitaler Abonnements verständlich dargestellt.", heading: "Unser Ziel", paragraphs: ["Derselbe Dienst kann je nach Land, Währung, Steuern und Plattform unterschiedlich viel kosten. GeoSub ordnet geprüfte Regionalpreise nach einer einheitlichen Methode.", "Jeder Preis enthält Erhebungs- und Wechselkursdatum, Steuerkontext und Verlässlichkeit. Prüfen Sie den Endbetrag immer auf der offiziellen Zahlungsseite."] },
      "data-sources": { eyebrow: "Datenquellen", title: "Woher stammen die Preise?", description: "Die von GeoSub verwendeten Quellen und ihre Prüfung.", heading: "Nachvollziehbare Daten", paragraphs: ["Öffentliche Ranglisten verwenden geprüfte regionale App-Store-Abonnementpreise mit lokaler Währung und Erhebungsdatum.", "Wechselkurse dienen nur dem Vergleich. Steuerangaben liefern Kontext; maßgeblich bleibt der Preis der Plattform beim Bezahlen."] },
      privacy: { eyebrow: "Datenschutz", title: "Datenschutzerklärung", description: "Grundsätze für den Umgang mit Besucherdaten.", heading: "Begrenzte Datenerhebung", paragraphs: ["GeoSub kann technische und statistische Daten erfassen, die für Betrieb, Sicherheit und Verbesserung der Website nötig sind.", "Google Analytics oder Google Tag Manager können Seitenaufrufe, allgemeine Interaktionen und Leistung messen. Diese Messungen verbessern Inhalte und Zuverlässigkeit; Zahlungsdaten oder sensible Identitätsangaben werden dafür nicht verlangt."] },
      terms: { eyebrow: "Bedingungen", title: "Nutzungsbedingungen", description: "Regeln für die Nutzung der GeoSub-Daten und Vergleiche.", heading: "Ein Informationsangebot", paragraphs: ["GeoSub stellt Vergleiche zu Informationszwecken bereit. Preise, Steuern, Wechselkurse und Verfügbarkeit können sich ohne Vorankündigung ändern.", "GeoSub garantiert keinen Zugang zu Abonnements anderer Regionen und empfiehlt keine Umgehung von Plattformregeln."] },
      guides: { eyebrow: "Ratgeber", title: "Regionale Abonnements richtig verstehen", description: "Praktische Hinweise zu Preisen, Steuern und Zahlungsbedingungen.", heading: "Ratgeber auswählen", paragraphs: ["Der Preisratgeber erklärt regionale Unterschiede. Zahlung und Konto behandelt typische Einschränkungen. Die Methodik beschreibt Erhebung und Prüfung.", "Die Ratgeber ergänzen die Preistabellen, ersetzen aber nicht die offiziellen Bedingungen des Anbieters."] },
      "guides/price-guide": { eyebrow: "Preisratgeber", title: "Regionale Preisvergleiche lesen", description: "Lokalen Preis, Anzeigewährung und Referenzabweichung verstehen.", heading: "Vergleichbare Werte nutzen", paragraphs: ["Beginnen Sie mit dem lokalen Preis und seinem Erhebungsdatum. Prüfen Sie danach die Umrechnung in die gewählte Währung und das Wechselkursdatum.", "Ein niedrigerer Preis garantiert keinen Zugang. Steuern, Kontoland und Zahlungsmethode bleiben entscheidend."] },
      "guides/payment-account": { eyebrow: "Zahlung und Konto", title: "Konto vor dem Abonnement prüfen", description: "Kontoland, Zahlungsmethode und Rechnungsdaten können regionale Käufe begrenzen.", heading: "Vor dem Bezahlen", paragraphs: ["Prüfen Sie lokale Verfügbarkeit, Kontoland, akzeptierte Zahlungsmethoden und die erforderliche Rechnungsadresse.", "Verwenden Sie keine falschen Angaben. Endpreis und Berechtigung werden auf der offiziellen Zahlungsseite angezeigt."] },
      "guides/methodology": { eyebrow: "Methodik", title: "So prüft GeoSub Preise", description: "Von der regionalen Erhebung bis zum stabilen veröffentlichten Preis.", heading: "Erheben, prüfen, veröffentlichen", paragraphs: ["Beobachtungen werden einem kanonischen Tarif zugeordnet, auf Währung und Abrechnungszeitraum geprüft und mit früheren Erhebungen verglichen.", "Unstimmige Werte werden isoliert. Nur ausreichend stabile und geprüfte Preise gelangen auf öffentliche Seiten."] },
    },
  },
  pt: {
    home: {
      eyebrow: "Preços de assinaturas digitais no mundo", title: "Preços globais de assinaturas num só lugar",
      description: "O GeoSub compara serviços de IA e streaming entre países. Consulte o preço local, a conversão na moeda escolhida, impostos e poder de compra.", view: "Explorar",
      sections: [
        { title: "Assinaturas de IA", description: "Compare ChatGPT, Claude, Gemini, Grok e outros serviços por país.", href: "/pt/ai-pricing/", tag: "IA" },
        { title: "Streaming", description: "Consulte diferenças regionais da Netflix, Disney+ e outras plataformas.", href: "/pt/streaming-pricing/", tag: "Streaming" },
        { title: "Fontes de dados", description: "Conheça a origem dos preços, câmbios e informações fiscais.", href: "/pt/data-sources/", tag: "Dados" },
        { title: "Guias", description: "Aprenda a interpretar preços regionais e condições de pagamento.", href: "/pt/guides/", tag: "Guias" },
      ],
    },
    pages: {
      about: { eyebrow: "Sobre", title: "Sobre o GeoSub", description: "Uma forma clara de compreender diferenças de preço nas assinaturas digitais.", heading: "O nosso objetivo", paragraphs: ["O mesmo serviço pode ter preços diferentes consoante o país, a moeda, os impostos e a plataforma. O GeoSub organiza preços regionais verificados com um método comum.", "Cada preço apresenta datas de recolha e câmbio, contexto fiscal e fiabilidade. Confirme sempre o valor final na página oficial de pagamento."] },
      "data-sources": { eyebrow: "Fontes de dados", title: "De onde vêm os preços?", description: "As fontes usadas pelo GeoSub e o respetivo processo de verificação.", heading: "Dados rastreáveis", paragraphs: ["As classificações públicas usam preços regionais verificados da App Store, com moeda local e data de recolha.", "Os câmbios servem apenas para comparação. A informação fiscal dá contexto; prevalece o valor apresentado pela plataforma no pagamento."] },
      privacy: { eyebrow: "Privacidade", title: "Política de privacidade", description: "Princípios aplicados pelo GeoSub aos dados dos visitantes.", heading: "Recolha limitada", paragraphs: ["O GeoSub pode registar dados técnicos e estatísticos necessários ao funcionamento, segurança e melhoria do site.", "O Google Analytics ou o Google Tag Manager podem medir visualizações, interações gerais e desempenho. Estas medições melhoram conteúdos e fiabilidade, sem solicitar dados de pagamento ou informações sensíveis de identidade."] },
      terms: { eyebrow: "Termos", title: "Termos de utilização", description: "Regras para utilizar os dados e comparações do GeoSub.", heading: "Um serviço informativo", paragraphs: ["O GeoSub fornece comparações para fins informativos. Preços, impostos, câmbios e disponibilidade podem mudar sem aviso.", "O GeoSub não garante o acesso a assinaturas de outras regiões nem incentiva o contorno das regras das plataformas."] },
      guides: { eyebrow: "Guias", title: "Compreender assinaturas regionais", description: "Orientações práticas para interpretar preços, impostos e condições de pagamento.", heading: "Escolha um guia", paragraphs: ["O guia de preços explica diferenças regionais; pagamentos e conta aborda restrições comuns; a metodologia descreve recolha e verificação.", "Os guias complementam as tabelas de preços sem substituir as condições oficiais do fornecedor."] },
      "guides/price-guide": { eyebrow: "Guia de preços", title: "Ler uma comparação regional", description: "Compreender preço local, moeda escolhida e diferença face à referência.", heading: "Comparar valores coerentes", paragraphs: ["Comece pelo preço local e pela data de recolha; depois consulte a conversão na moeda escolhida e a data do câmbio.", "Um preço mais baixo não garante acesso. Impostos, país da conta e método de pagamento continuam a ser determinantes."] },
      "guides/payment-account": { eyebrow: "Pagamentos e conta", title: "Verificar a conta antes de assinar", description: "País da conta, pagamento e faturação podem limitar uma compra regional.", heading: "Antes do pagamento", paragraphs: ["Confirme a disponibilidade local, o país da conta, os métodos de pagamento aceites e o endereço de faturação exigido.", "Não utilize informações falsas. O preço e a elegibilidade finais surgem na página oficial de pagamento."] },
      "guides/methodology": { eyebrow: "Metodologia", title: "Como o GeoSub verifica preços", description: "Da recolha regional à publicação de um preço estável.", heading: "Recolher, verificar, publicar", paragraphs: ["As observações são associadas a um plano canónico, verificadas quanto à moeda e período de faturação e comparadas com recolhas anteriores.", "Valores incoerentes são isolados. Apenas preços suficientemente estáveis e verificados alimentam as páginas públicas."] },
    },
  },
};

export function getEuropeanInfoMetadata(locale: EuropeanLocale, segments: string[]): Metadata {
  const page = copy[locale].pages[segments.join("/") as InfoKey];
  if (!page) return {};
  return { title: page.title, description: page.description };
}

export function EuropeanHomePage({ locale }: { locale: EuropeanLocale }) {
  const text = copy[locale].home;
  return (
    <main className="min-h-screen bg-[#faf8f2]">
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-lime-600">{text.eyebrow}</p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-zinc-950 md:text-6xl">{text.title}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-zinc-600 md:text-lg">{text.description}</p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {text.sections.map((section) => (
            <Link key={section.href} href={section.href} className="group rounded-xl border border-zinc-200 bg-white p-7 shadow-sm shadow-zinc-950/[0.03] transition hover:-translate-y-0.5 hover:border-lime-200 hover:bg-lime-50/40">
              <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-500">{section.tag}</span>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-zinc-950">{section.title}</h2>
              <p className="mt-3 min-h-[72px] text-sm leading-6 text-zinc-500">{section.description}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-lime-600">{text.view} <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export function EuropeanInfoPage({ locale, segments }: { locale: EuropeanLocale; segments: string[] }) {
  const page = copy[locale].pages[segments.join("/") as InfoKey];
  if (!page) notFound();
  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-lime-600">{page.eyebrow}</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">{page.title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-600">{page.description}</p>
        <div className="mt-10 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          <h2 className="text-xl font-black text-zinc-950">{page.heading}</h2>
          {page.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 text-sm leading-8 text-zinc-600">{paragraph}</p>)}
        </div>
      </section>
    </main>
  );
}
