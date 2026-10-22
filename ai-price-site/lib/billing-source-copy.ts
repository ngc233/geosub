import type { PricingFaq } from './pricing-seo';

// Preserve existing App Store experiment copy exactly. A Web-only dataset must
// not inherit App Store/Apple ID claims from the shared historical templates.
export function getBillingSourceText(text: string, billingChannel = 'App Store') {
  return billingChannel === 'Web' ? text.replace(/App Store|App-Store/g, 'Web') : text;
}

export function getBillingSourceFaqs(faqs: PricingFaq[], billingChannel = 'App Store') {
  if (billingChannel !== 'Web') return faqs;
  return faqs.filter(faq => !faq.a.includes('Apple ID'))
    .map(faq => ({ q: getBillingSourceText(faq.q, billingChannel), a: getBillingSourceText(faq.a, billingChannel) }));
}
