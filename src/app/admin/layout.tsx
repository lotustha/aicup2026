import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

/**
 * Bare passthrough for the /admin segment. The authenticated nav shell lives in
 * the `(panel)` route group so the standalone login screen (/admin/login) is
 * NOT wrapped in admin chrome. Route groups add no URL segment, so /admin,
 * /admin/notify, /admin/messages are unchanged.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
