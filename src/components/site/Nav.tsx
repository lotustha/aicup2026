"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today" },
  { href: "/schedule", label: "Schedule" },
  { href: "/teams", label: "Teams" },
  { href: "/standings", label: "Standings" },
];

export default function Nav() {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-white/[0.04] backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="brand-gradient grid h-9 w-9 place-items-center rounded-xl text-lg shadow-lg shadow-primary/20">
            🏆
          </span>
          <span className="hidden text-base font-extrabold tracking-tight sm:block">
            World Cup <span className="text-primary">2026</span>
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-0.5 sm:gap-1">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors sm:px-4 ${
                isActive(t.href)
                  ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                  : "text-tsecondary hover:bg-white/10 hover:text-tprimary"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
