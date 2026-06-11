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
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="brand-gradient grid h-8 w-8 place-items-center rounded-lg text-base">
            🏆
          </span>
          <span className="text-sm font-extrabold tracking-tight">
            World Cup <span className="text-primary">2026</span>
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                isActive(t.href)
                  ? "bg-primary/15 text-primary"
                  : "text-tsecondary hover:text-tprimary"
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
