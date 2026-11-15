import { requireDashboardArea } from "@/lib/auth/guard";

/** Team members without "all" access are sent to their own section. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireDashboardArea("all");
  return children;
}
