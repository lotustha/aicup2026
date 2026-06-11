import Link from "next/link";
import type { ReactNode } from "react";
import LogoutButton from "../LogoutButton";

export const dynamic = "force-dynamic";

const navLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/streams", label: "Streams" },
  { href: "/admin/notify", label: "Send Notification" },
  { href: "/admin/messages", label: "Messages" },
];

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2 font-semibold">
              <span className="text-lg">⚽</span>
              <span>WC&nbsp;2026 Admin</span>
            </Link>
            <nav className="flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
