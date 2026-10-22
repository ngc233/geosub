import { createHmac, timingSafeEqual } from 'node:crypto';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getCollectorPublicationClaim(value: string | null, preview: string) {
  if (!value || !/^[a-f0-9]{32,128}$/i.test(preview)) return null;
  const [jobId, signature, ...rest] = value.split('.');
  if (rest.length || !uuid.test(jobId || '') || !/^[a-f0-9]{64}$/.test(signature || '')) return null;
  const expected = createHmac('sha256', preview).update(`collector-publication-v1:${jobId}`).digest();
  return timingSafeEqual(Buffer.from(signature, 'hex'), expected) ? jobId : null;
}
