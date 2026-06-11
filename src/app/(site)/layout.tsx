import Nav from "@/components/site/Nav";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 pb-16">{children}</main>
    </div>
  );
}
