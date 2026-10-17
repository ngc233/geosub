export type AdminCapability = 'read' | 'draft' | 'manage' | 'account';
export function canAdmin(role: string, capability: AdminCapability): boolean {
  if (!['OWNER','EDITOR','VIEWER'].includes(role)) return false;
  if (capability === 'read' || capability === 'account') return true;
  if (capability === 'draft') return role === 'OWNER' || role === 'EDITOR';
  return capability === 'manage' && role === 'OWNER';
}
export function assertAdminCapability(role: string, capability: AdminCapability) {
  if (!canAdmin(role,capability)) throw new Error('当前账号没有此操作权限。请联系站点负责人。');
}
