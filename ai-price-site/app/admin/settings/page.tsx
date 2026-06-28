import AdminModulePlaceholder from "../../../components/admin/AdminModulePlaceholder";

export default function AdminSettingsPage() {
  return (
    <AdminModulePlaceholder
      eyebrow="Settings"
      title="系统设置"
      description="管理站点名称、默认语言、GTM、GA4、AdSense、合规说明和全局配置。"
      nextStep="后续会接入站点设置表单，并支持直接从后台修改全局配置。"
    />
  );
}
