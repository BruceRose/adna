import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Audience DNA", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="admin">
      <nav className="admin-nav">
        <Link href="/admin">Responses</Link>
        <form action={logout}>
          <button className="ghost small">Sign out</button>
        </form>
      </nav>
      {children}
    </div>
  );
}
