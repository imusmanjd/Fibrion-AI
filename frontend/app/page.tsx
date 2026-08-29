import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Factory,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: Factory,
    title: "Production intelligence",
    text: "Turn manufacturing data into operational metrics and trends.",
  },
  {
    icon: BrainCircuit,
    title: "AI analysis",
    text: "Identify findings, causes, anomalies, and recommendations.",
  },
  {
    icon: BarChart3,
    title: "Visual analytics",
    text: "Explore production, quality, rejection, and operational patterns.",
  },
  {
    icon: ShieldCheck,
    title: "Verified insights",
    text: "Keep analytical conclusions grounded in computed production data.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col">

        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <span className="text-sm font-bold text-[var(--accent)]">
                F
              </span>
            </div>

            <div>
              <div className="text-sm font-semibold tracking-[0.18em]">
                FIBRION
              </div>

              <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                Industrial intelligence
              </div>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/75 transition hover:bg-white/[0.08] hover:text-white sm:flex"
          >
            Open workspace
            <ArrowRight size={15} />
          </Link>
        </header>

        <section className="flex flex-1 flex-col justify-center py-20">
          <div className="max-w-4xl">

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/8 px-3 py-1.5 text-xs text-[var(--accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              AI-powered manufacturing analytics
            </div>

            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.03] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
              Understand your factory data.
              <span className="block text-white/35">
                Act on what matters.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-7 text-white/50 sm:text-lg">
              Fibrion transforms production datasets into verified KPIs,
              intelligent findings, operational recommendations, visual
              analytics, and management-ready reports.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/analyze"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#06110d] transition hover:brightness-105"
              >
                Analyze a dataset

                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white/70 transition hover:bg-white/[0.07] hover:text-white"
              >
                View dashboard
              </Link>
            </div>
          </div>

          <div className="mt-20 grid gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="bg-[#0b0f15] p-5 transition hover:bg-[#0e131b]"
                >
                  <Icon
                    size={19}
                    strokeWidth={1.6}
                    className="text-[var(--accent)]"
                  />

                  <h2 className="mt-5 text-sm font-medium text-white">
                    {feature.title}
                  </h2>

                  <p className="mt-2 text-xs leading-5 text-white/40">
                    {feature.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-white/6 py-5 text-[11px] text-white/25">
          <span>Fibrion AI</span>
          <span>Industrial intelligence platform</span>
        </footer>

      </div>
    </main>
  );
}