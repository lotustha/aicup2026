"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    setLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // ignore — redirect regardless
    } finally {
      window.location.href = "/admin/login";
    }
  }

  return (
    <button
      onClick={onLogout}
      disabled={loading}
      className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-red-500 hover:text-red-400 disabled:opacity-50"
    >
      {loading ? "…" : "Logout"}
    </button>
  );
}
