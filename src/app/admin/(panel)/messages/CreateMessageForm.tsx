"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Audience = "all" | "team";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500";

export default function CreateMessageForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("info");
  const [audience, setAudience] = useState<Audience>("all");
  const [teamId, setTeamId] = useState("");
  const [push, setPush] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          type,
          audience,
          ...(audience === "team" ? { teamId } : {}),
          push,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult(
          push
            ? `Message created and pushed to ${data.sent ?? 0} device(s).`
            : "Message created."
        );
        setTitle("");
        setBody("");
        setTeamId("");
        setPush(false);
        router.refresh();
      } else {
        setError(data?.error ?? "Failed to create message");
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
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
          placeholder="Match update"
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
          placeholder="Write the in-app message…"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={inputClass}
          >
            <option value="info">Info</option>
            <option value="announcement">Announcement</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Audience
          </label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
            className={inputClass}
          >
            <option value="all">All</option>
            <option value="team">Team followers</option>
          </select>
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

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={push}
          onChange={(e) => setPush(e.target.checked)}
          className="accent-red-500"
        />
        Also send as push notification
      </label>

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
        {loading ? "Saving…" : "Create message"}
      </button>
    </form>
  );
}
