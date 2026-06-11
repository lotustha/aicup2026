import { prisma } from "@/lib/db";
import CreateMessageForm from "./CreateMessageForm";

export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function MessagesPage() {
  const messages = await prisma.message.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section>
        <h1 className="mb-1 text-2xl font-semibold">Create Message</h1>
        <p className="mb-6 text-sm text-slate-400">
          Post an in-app message, optionally pushed via FCM.
        </p>
        <CreateMessageForm />
      </section>

      <section>
        <h2 className="mb-1 text-2xl font-semibold">Recent Messages</h2>
        <p className="mb-6 text-sm text-slate-400">Last 20 messages.</p>

        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Audience</th>
                <th className="px-4 py-3 font-medium">Pushed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {messages.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No messages yet.
                  </td>
                </tr>
              )}
              {messages.map((m) => (
                <tr key={m.id} className="bg-slate-900/40 hover:bg-slate-900/70">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                    {formatDate(m.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-100">{m.title}</td>
                  <td className="px-4 py-3 text-slate-300">
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs">
                      {m.audience}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {m.pushed ? (
                      <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-xs text-red-400">
                        pushed
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
