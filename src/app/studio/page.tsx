import Link from "next/link";
import { Section } from "../page";
import { Thumb } from "@/components/thumb";
import { EXPLORER } from "@/lib/chain";
import { DEMO_CREATOR, EPOCHS, GAMES, POOL_USD, cohort } from "@/lib/data";
import { BPS, WEIGHTS_V1, rankCohort } from "@/lib/rank";

export const metadata = {
  title: "Studio — Clearcade",
  description:
    "A creator's view: placement, the component that held it back, and what is owed per epoch.",
};

/**
 * The creator's side.
 *
 * The one screen a developer on a platform like this actually wants and never
 * gets: not a graph of impressions, but a sentence saying which of the four
 * numbers is costing them placement. Since the rule is public, that sentence
 * can be derived rather than guessed at, and it is the clearest demonstration
 * of what publishing the rule is worth in practice.
 */
export default function StudioPage() {
  const mine = GAMES.filter((g) => g.creator === DEMO_CREATOR);

  const perEpoch = EPOCHS.map((e) => {
    const ranked = rankCohort(cohort(e), WEIGHTS_V1);
    const rows = mine
      .map((g) => ({ game: g, row: ranked.find((r) => r.gameId === g.id) }))
      .filter((x) => x.row);
    const owed = rows.reduce(
      (sum, x) => sum + Math.floor((POOL_USD[e] * x.row!.shareBps) / BPS),
      0,
    );
    return { epoch: e, rows, owed, size: ranked.length };
  });

  const lifetime = perEpoch.reduce((sum, p) => sum + p.owed, 0);
  const latest = perEpoch[perEpoch.length - 1];

  return (
    <main className="pb-10">
      <Section
        eyebrow="Studio"
        title={DEMO_CREATOR}
        lede="A worked example of a creator account. Placement, the arithmetic behind it, and the payout that follows from the same number."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            value={`$${lifetime.toLocaleString("en-US")}`}
            label={`earned across ${EPOCHS.length} epochs`}
            accent="amber"
          />
          <Stat
            value={`$${latest.owed.toLocaleString("en-US")}`}
            label={`owed from epoch ${latest.epoch}`}
            accent="amber"
          />
          <Stat
            value={String(mine.length)}
            label="games in the catalogue"
            accent="glass"
          />
        </div>
      </Section>

      {perEpoch
        .slice()
        .reverse()
        .map((p) => (
          <Section
            key={p.epoch}
            eyebrow={`Epoch ${p.epoch}`}
            title={`$${p.owed.toLocaleString("en-US")} from a $${POOL_USD[p.epoch].toLocaleString("en-US")} pool`}
            lede={`Ranked against ${p.size} games. Every figure below can be recomputed from the committed table on the rule page.`}
          >
            <div className="space-y-4">
              {p.rows.map(({ game, row }) => {
                // The weakest component after weighting is the honest answer to
                // "what should I work on", so it is stated outright instead of
                // being left for the creator to infer from four bars.
                const contributions = (["reach", "retention", "depth", "rating"] as const).map(
                  (k) => ({
                    k,
                    contribution: Math.floor((row!.components[k] * WEIGHTS_V1[k]) / BPS),
                    headroom: Math.floor(
                      ((BPS - row!.components[k]) * WEIGHTS_V1[k]) / BPS,
                    ),
                  }),
                );
                const weakest = contributions.reduce((a, b) =>
                  b.headroom > a.headroom ? b : a,
                );

                const NAMES = {
                  reach: "reach",
                  retention: "next-day returns",
                  depth: "session length",
                  rating: "rating",
                } as const;

                return (
                  <div
                    key={game.id}
                    className="grid gap-5 rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-5 sm:grid-cols-[180px_minmax(0,1fr)]"
                  >
                    <Link href={`/game/${game.id}`}>
                      <Thumb game={game} className="aspect-[16/9] w-full rounded-xl" />
                    </Link>

                    <div>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Link
                          href={`/game/${game.id}`}
                          className="text-[15px] font-medium hover:text-[var(--color-glass-300)]"
                        >
                          {game.title}
                        </Link>
                        <span className="font-mono text-[13px] text-[var(--color-mist-500)] tnum">
                          rank {row!.rank} of {p.size}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {contributions.map((c) => (
                          <div key={c.k}>
                            <p className="text-[11px] text-[var(--color-mist-700)]">
                              {NAMES[c.k]}
                            </p>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-ink-800)]">
                              <div
                                className={`h-full rounded-full ${
                                  c.k === weakest.k
                                    ? "bg-[var(--color-coral-400)]"
                                    : "bg-[var(--color-glass-500)]"
                                }`}
                                style={{
                                  width: `${(row!.components[c.k] / BPS) * 100}%`,
                                }}
                              />
                            </div>
                            <p className="mt-1 font-mono text-[11.5px] text-[var(--color-mist-300)] tnum">
                              +{c.contribution}
                            </p>
                          </div>
                        ))}
                      </div>

                      <p className="mt-4 rounded-xl border border-[var(--color-ink-700)] bg-[var(--color-ink-850)] px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--color-mist-300)]">
                        The largest gap is {NAMES[weakest.k]}. Bringing it to full marks
                        would add {weakest.headroom} points to a score of {row!.score}, which
                        at this epoch&apos;s pool is worth roughly $
                        {Math.floor(
                          (POOL_USD[p.epoch] * weakest.headroom) / (BPS * 4),
                        ).toLocaleString("en-US")}{" "}
                        more. Everything needed to check that sentence is on the rule page.
                      </p>

                      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
                        <a
                          href={`${EXPLORER}/address/${game.creatorWallet}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all font-mono text-[11px] text-[var(--color-mist-700)] underline decoration-dotted hover:text-[var(--color-mist-300)]"
                        >
                          {game.creatorWallet}
                        </a>
                        <span className="font-mono text-[15px] text-[var(--color-amber-400)] tnum">
                          $
                          {Math.floor(
                            (POOL_USD[p.epoch] * row!.shareBps) / BPS,
                          ).toLocaleString("en-US")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        ))}

      <Section
        eyebrow="Cashing out"
        title="There is nothing to qualify for"
        lede="No earnings floor to clear, no supported-country list, no review of whether you deserve access to money already computed as yours. Settlement is a transfer to the address above."
      >
        <div className="rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-5">
          <p className="text-[13px] leading-relaxed text-[var(--color-mist-300)]">
            Payouts run from the command line against devnet, and the ledger page lists
            every settlement this deployment has signed. The receipt for each one names the
            epoch commitment it settles against, so any amount can be traced back to the
            table it came from.
          </p>
          <Link
            href="/ledger"
            className="mt-4 inline-block rounded-xl border border-[var(--color-ink-600)] px-4 py-2.5 text-[13px] text-[var(--color-mist-300)] transition-colors hover:border-[var(--color-glass-600)] hover:text-[var(--color-mist-100)]"
          >
            Open the ledger
          </Link>
        </div>
      </Section>
    </main>
  );
}

function Stat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: "amber" | "glass";
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-5">
      <p
        className={`font-mono text-[30px] leading-none tnum ${
          accent === "amber"
            ? "text-[var(--color-amber-400)]"
            : "text-[var(--color-glass-400)]"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-[12.5px] text-[var(--color-mist-500)]">{label}</p>
    </div>
  );
}
