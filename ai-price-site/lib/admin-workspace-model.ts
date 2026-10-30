export type WorkspaceRow = {
 id:string;slug:string;name:string;publish_status:string;billing_platform?:'ios'|'web';
 price_count:number;stale_count:number;latest_checked:string|null;
 job_count:number;running_count:number;failed_count:number;queued_count:number;
};
export function workspaceStatus(row:WorkspaceRow, partial:boolean){
 const collection=partial?'未导入采集记录':row.running_count>0?'采集执行中':row.failed_count>0?'最近采集失败':row.queued_count>0?'等待调度':row.job_count>0?'已配置采集':'未配置采集';
 // A running task must not obscure an independently stale price dataset.
 const needsAction=(row.publish_status.toLowerCase()==='published'&&row.price_count===0)||row.stale_count>0||(!partial&&row.failed_count>0);
 const progress=!partial&&(row.running_count>0||row.queued_count>0);
 return {publication:row.publish_status.toLowerCase()==='published'?'已发布':row.publish_status.toLowerCase()==='archived'?'已归档':row.publish_status.toLowerCase()==='review'?'审核中':row.publish_status.toLowerCase()==='draft'?'草稿':'未知状态',collection,quality:row.price_count===0?'尚无正式价格':row.stale_count>0?`${row.stale_count} 条价格待更新`:'价格时效正常',needsAction,progress};
}
