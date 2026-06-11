import Nav from "@/components/site/Nav";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full">
      {/* Fixed liquid-glass color backdrop that panels refract over. */}
      <div className="app-bg" aria-hidden />
      <Nav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
