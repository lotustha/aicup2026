"use client";

import { useState } from "react";

export const dynamic = "force-dynamic";

type Audience = "all" | "team" | "device";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500";

export default function NotifyPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [teamId, setTeamId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [fixtureId, setFixtureId] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          audience,
          ...(audience === "team" ? { teamId } : {}),
          ...(audience === "device" ? { deviceId } : {}),
          ...(fixtureId ? { fixtureId } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult(`Sent to ${data.sent ?? 0} device(s) (${data.failed ?? 0} failed).`);
      } else {
        setError(data?.error ?? "Failed to send notification");
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold">Send Notification</h1>
      <p className="mb-6 text-sm text-slate-400">
        Push a notification to devices via FCM.
      </p>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={inputClass}
            placeholder="Kickoff in 10 minutes!"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={3}
            className={inputClass}
            placeholder="Don't miss the match…"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-300">
            Audience
          </span>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            {(
              [
                { v: "all", label: "All devices" },
                { v: "team", label: "Team followers" },
                { v: "device", label: "Single device" },
              ] as { v: Audience; label: string }[]
            ).map((opt) => (
              <label
                key={opt.v}
                className="flex items-center gap-2 text-sm text-slate-300"
              >
                <input
                  type="radio"
                  name="audience"
                  checked={audience === opt.v}
                  onChange={() => setAudience(opt.v)}
                  className="accent-red-500"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {audience === "team" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Team ID
            </label>
            <input
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              required
              inputMode="numeric"
              className={inputClass}
              placeholder="e.g. 26"
            />
          </div>
        )}

        {audience === "device" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Device ID
            </label>
            <input
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              required
              className={inputClass}
              placeholder="cuid…"
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Fixture ID <span className="text-slate-500">(optional deep link)</span>
          </label>
          <input
            value={fixtureId}
            onChange={(e) => setFixtureId(e.target.value)}
            inputMode="numeric"
            className={inputClass}
            placeholder="e.g. 12345"
          />
        </div>

        {result && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            {result}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-red-500 px-4 py-2 font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send notification"}
        </button>
      </form>
    </div>
  );
}
