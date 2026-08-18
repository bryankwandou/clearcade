import type { Metadata } from "next";
import Link from "next/link";
import { Mark, Wordmark } from "@/components/logo";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clearcade — the ranking is published, and you can redo it",
  description:
    "A catalogue of player-made games where the rule that decides which games get seen is published in full, committed to Solana before each ranking goes out, and recomputable by anyone. Payouts follow the same number.",
  openGraph: {
    title: "Clearcade",
    description:
      "The rule that decides which games get seen is published, committed on chain, and recomputable by anyone.",
    type: "website",
  },
};

const NAV = [
  { href: "/catalogue", label: "Catalogue" },
  { href: "/ledger", label: "Ledger" },
  { href: "/studio", label: "Studio" },
  { href: "/rule", label: "The rule" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-50 border-b border-[var(--color-ink-800)] bg-[var(--color-ink-950)]/85 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between px-5">
            <Link href="/" aria-label="Clearcade home">
              <Wordmark />
            </Link>

            <nav className="flex items-center gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-lg px-3 py-1.5 text-[13px] text-[var(--color-mist-300)] transition-colors hover:bg-[var(--color-ink-850)] hover:text-[var(--color-mist-100)]"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {children}

        <footer className="mt-24 border-t border-[var(--color-ink-800)]">
          <div className="mx-auto max-w-[1240px] px-5 py-10">
            <div className="flex flex-wrap items-start justify-between gap-8">
              <div className="max-w-sm">
                <Mark size={28} />
                <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-mist-500)]">
                  Clearcade runs on Solana devnet. The catalogue and its telemetry are
                  sample data; the ranking rule, the commitments and the payouts are real
                  and can be checked against the public chain.
                </p>
              </div>

              <div className="flex gap-12 text-[13px]">
                <div>
                  <p className="font-medium text-[var(--color-mist-300)]">Read</p>
                  <ul className="mt-2 space-y-1.5 text-[var(--color-mist-500)]">
                    <li>
                      <Link href="/rule" className="hover:text-[var(--color-mist-100)]">
                        The ranking rule
                      </Link>
                    </li>
                    <li>
                      <Link href="/ledger" className="hover:text-[var(--color-mist-100)]">
                        Epoch commitments
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-[var(--color-mist-300)]">Check</p>
                  <ul className="mt-2 space-y-1.5 text-[var(--color-mist-500)]">
                    <li>
                      <a
                        href="https://explorer.solana.com/?cluster=devnet"
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-[var(--color-mist-100)]"
                      >
                        Solana explorer
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
