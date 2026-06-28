import AdminAlert from "./AdminAlert";
import { AdminPageHeader } from "./AdminCard";

export default function AdminModulePlaceholder({
  eyebrow,
  title,
  description,
  nextStep,
}: {
  eyebrow: string;
  title: string;
  description: string;
  nextStep: string;
}) {
  return (
    <div>
      <AdminPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
      />

      <AdminAlert title="模块即将接入" variant="info">
        <p>{nextStep}</p>
      </AdminAlert>
    </div>
  );
}
