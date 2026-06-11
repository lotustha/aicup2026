import type { Fixture } from "@/lib/site-data";

// Date/time + match formatting, mirroring the Flutter app's Fmt helpers.
// Times are stored UTC; rendered with the viewer's locale on the client where
// possible. On the server we render a stable UTC-ish label.

export function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function fullDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function statusLabel(f: Fixture) {
  switch (f.status) {
    case "live":
      return f.minute != null ? `${f.minute}'` : "LIVE";
    case "halfTime":
      return "HT";
    case "finished":
      return "FT";
    case "postponed":
      return "PST";
    case "cancelled":
      return "CANC";
    default:
      return timeOf(f.kickoff);
  }
}
