import Link from "next/link";
import type { Fixture, Team } from "@/lib/site-data";
import { isLive } from "@/lib/site-data";
import { dayLabel, statusLabel, timeOf } from "@/lib/format";

// Shared design-system components for the web frontend, mirroring the Flutter
// app's common widgets (TeamCrest, LiveBadge, StatusPill, MatchCard, ...).

export function TeamCrest({
  url,
  label,
  size = 34,
}: {
  url?: string | null;
  label: string;
  size?: number;
}) {
  const initials = (label || "?").slice(0, 3).toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center overflow-hidden rounded-md bg-surface2 shrink-0"
      style={{ width: size, height: size * 0.72 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="h-full w-full object-cover" />
      ) : (
        <span className="text-[10px] font-extrabold text-tsecondary">
          {initials}
        </span>
      )}
    </span>
  );
}

export function LiveBadge({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="live-gradient inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[10px] font-extrabold tracking-wide text-white">
      <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />
      {label}
    </span>
  );
}

export function StatusPill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "primary" | "secondary" | "accent";
}) {
  const tones: Record<string, string> = {
    muted: "text-ttertiary bg-ttertiary/15",
    primary: "text-primary bg-primary/15",
    secondary: "text-secondary bg-secondary/15",
    accent: "text-accent bg-accent/15",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-[3px] text-[10px] font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-1 pb-2 pt-5">
      <h2 className="text-lg font-bold text-tprimary">{title}</h2>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <p className="font-semibold text-tprimary">{title}</p>
      {message && <p className="text-sm text-tsecondary">{message}</p>}
    </div>
  );
}

export function MatchCard({ f }: { f: Fixture }) {
  const live = isLive(f);
  const scheduled = f.status === "scheduled";
  return (
    <Link
      href={`/match/${f.id}`}
      className="card block px-4 py-3 transition-colors hover:border-primary/50"
    >
      <div className="mb-3 flex items-center justify-between">
        <StatusPill>{f.stage ?? "World Cup"}</StatusPill>
        {live ? (
          <LiveBadge label={statusLabel(f)} />
        ) : (
          <span className="text-[11px] font-semibold text-ttertiary">
            {f.status === "finished" ? "Full time" : dayLabel(f.kickoff)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <TeamSide team={f.home} align="start" />
        <div className="px-2 text-center">
          {scheduled ? (
            <span className="text-base font-extrabold text-tsecondary">
              {timeOf(f.kickoff)}
            </span>
          ) : (
            <span
              className={`text-xl font-black tracking-wider ${
                live ? "text-secondary" : "text-tprimary"
              }`}
            >
              {f.homeScore ?? 0}&nbsp;&nbsp;{f.awayScore ?? 0}
            </span>
          )}
        </div>
        <TeamSide team={f.away} align="end" />
      </div>
    </Link>
  );
}

function TeamSide({ team, align }: { team: Team; align: "start" | "end" }) {
  return (
    <div
      className={`flex flex-1 items-center gap-2 ${
        align === "end" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <TeamCrest url={team.crestUrl} label={team.code ?? team.name} />
      <span className="truncate text-sm font-semibold text-tprimary">
        {team.name}
      </span>
    </div>
  );
}
