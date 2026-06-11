"use client";

import { useState } from "react";

export interface StreamRow {
  id: number;
  label: string;
  sub: string;
  status: string;
  streamUrl: string | null;
}

function StatusTag({ status }: { status: string }) {
  const live = status === "live" || status === "halfTime";
  const finished = status === "finished";
  const cls = live
    ? "bg-emerald-500/15 text-emerald-400"
    : finished
    ? "bg-slate-600/30 text-slate-300"
    : "bg-sky-500/15 text-sky-400";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cls}`}>
      {live ? "Live" : finished ? "FT" : "Scheduled"}
    </span>
  );
}

function Row({ row }: { row: StreamRow }) {
  const [url, setUrl] = useState(row.streamUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<null | "ok" | "err">(null);

  async function save(next?: string) {
    setSaving(true);
    setSaved(null);
    try {
      const res = await fetch("/api/admin/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixtureId: row.id, streamUrl: next ?? url }),
      });
      setSaved(res.ok ? "ok" : "err");
    } catch {
      setSaved("err");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 md:flex-row md:items-center">
      <div className="min-w-0 md:w-64">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-slate-100">{row.label}</span>
          <StatusTag status={row.status} />
        </div>
        <p className="truncate text-xs text-slate-400">{row.sub}</p>
      </div>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://embed.example.com/stream.html"
        className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => save()}
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {url && (
          <button
            onClick={() => {
              setUrl("");
              save("");
            }}
            disabled={saving}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            Clear
          </button>
        )}
        {saved === "ok" && <span className="text-sm text-emerald-400">✓</span>}
        {saved === "err" && <span className="text-sm text-red-400">✗</span>}
      </div>
    </div>
  );
}

export default function StreamsManager({ rows }: { rows: StreamRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
        No fixtures yet.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Row key={r.id} row={r} />
      ))}
    </div>
  );
}
