import { adminRecordVersion, AdminSaveConflict } from './admin-save';
export const ANALYTICS_KEYS=['ga4_id','gtm_id'];
export const NOTIFICATION_KEYS=['operations_brief_enabled'];
export function settingsVersion(rows:ReadonlyArray<{settingKey:string;valueText:string|null}>,keys:readonly string[]){
 return adminRecordVersion(Object.fromEntries([...keys].sort().map(key=>[key,rows.find(r=>r.settingKey===key)?.valueText??null])));
}
export function assertSettingsVersion(rows:ReadonlyArray<{settingKey:string;valueText:string|null}>,keys:readonly string[],expected:FormDataEntryValue|null){
 if(expected!==settingsVersion(rows,keys))throw new AdminSaveConflict('设置已被其他操作修改。本次输入仍保留，请重新打开页面核对后保存。');
}
