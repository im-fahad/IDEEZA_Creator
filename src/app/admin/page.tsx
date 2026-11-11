import { redirect } from "next/navigation";

// The admin opens on AI credit pricing (its Credit packs tab is /admin/credit-packs).
export default function AdminHome() {
  redirect("/admin/ai-credits");
}
