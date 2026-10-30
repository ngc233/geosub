import { timingSafeEqual } from 'node:crypto';
export function validContentRecoveryToken(value: string | null, expected: string | undefined) {
 if(!expected || !/^[a-f0-9]{64}$/.test(expected) || !value)return false;
 const a=Buffer.from(value),b=Buffer.from(expected);
 return a.length===b.length && timingSafeEqual(a,b);
}
