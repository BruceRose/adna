import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Audience DNA", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="admin">
      <nav className="admin-nav no-print">
        <Link href="/admin" className="admin-logo" aria-label="Audience DNA admin home">
          <Logo />
        </Link>
        <div className="admin-links">
          <Link href="/admin">Responses</Link>
          <Link href="/admin/reports">Audience reports</Link>
          <Link href="/admin/insights">Insights explorer</Link>
        </div>
        <form action={logout}>
          <button className="ghost small">Sign out</button>
        </form>
      </nav>
      {children}
    </div>
  );
}
