import { clearAdminSession } from "../../../lib/admin-auth";
import { redirect } from "next/navigation";

export async function POST() {
  await clearAdminSession();
  redirect("/admin-login");
}
