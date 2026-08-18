import Link from "next/link";
import { notFound } from "next/navigation";
import { Thumb } from "@/components/thumb";
import { EXPLORER } from "@/lib/chain";
import { EPOCHS, GAMES, INDEX, POOL_USD, cohort, metricsFor } from "@/lib/data";
import { BPS, WEIGHTS_V1, rankCohort } from "@/lib/rank";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = INDEX.get(id);
  return {
    title: game ? `${game.title} — Clearcade` : "Not found — Clearcade",
    description: game?.blurb,
  };
}

const LABEL = {
  reach: "Reach",
  retention: "Came back",
  depth: "Session depth",
  rating: "Rating",
} as const;

/**
 * One game, and the reason it sits where it sits.
 *
 * A store page usually tells a creator their rank and stops. The interesting
 * half is underneath: which of the four components carried the score and
 * which held it back. A developer reading this should be able to leave
 * knowing what to work on, which is the thing an opaque ranking can never
 * give them however many dashboards it ships.
 */
export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = INDEX.get(id);
  if (!game) notFound();

  const epoch = 3;
  const ranked = rankCohort(cohort(epoch), WEIGHTS_V1);
  const mine = ranked.find((r) => r.gameId === game.id);
  const metrics = metricsFor(game, epoch);

  const history = EPOCHS.map((e) => {
    const cohortRanked = rankCohort(cohort(e), WEIGHTS_V1);
    const row = cohortRanked.find((r) => r.gameId === game.id);
    return { epoch: e, row, pool: POOL_USD[e], size: cohortRanked.length };
  });

  return (
    <main className="mx-auto max-w-[1240px] px-5 pb-10 pt-10">
      <Link
        href="/catalogue"
        className="text-[13px] text-[var(--color-mist-500)] hover:text-[var(--color-mist-100)]"
      >
        Back to the catalogue
      </Link>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div>
          <Thumb game={game} className="aspect-[16/7] w-full rounded-2xl" />

          <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-[30px] font-semibold tracking-[-0.02em]">{game.title}</h1>
            <span className="rounded-md border border-[var(--color-ink-700)] px-2 py-0.5 text-[12px] text-[var(--color-mist-500)]">
              {game.category}
            </span>
          </div>

          <p className="mt-2 text-[14px] text-[var(--color-mist-300)]">
            {game.creator} · launched in epoch {game.launchedEpoch}
          </p>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--color-mist-300)]">
            {game.blurb}
          </p>

          {metrics && mine && (
            <section className="mt-8">
              <h2 className="text-[15px] font-semibold">
                Why it ranks {mine.rank} of {ranked.length}
              </h2>
              <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[var(--color-mist-500)]">
                Each bar is one component of the score, drawn at its actual value. The
                figure on the right is what that component contributed after its weight was
                applied, and the four contributions sum to the score.
              </p>

              <div className="mt-5 space-y-3.5">
                {(["reach", "retention", "depth", "rating"] as const).map((k) => {
                  const value = mine.components[k];
                  const contribution = Math.floor((value * WEIGHTS_V1[k]) / BPS);
                  return (
                    <div key={k}>
                      <div className="flex items-baseline justify-between text-[13px]">
                        <span>
                          {LABEL[k]}
                          <span className="ml-2 text-[11.5px] text-[var(--color-mist-700)]">
                            weight {(WEIGHTS_V1[k] / 100).toFixed(0)}%
                          </span>
                        </span>
                        <span className="font-mono text-[var(--color-mist-300)] tnum">
                          {(value / 100).toFixed(1)}% → {contribution}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--color-ink-800)]">
                        <div
                          className="h-full rounded-full bg-[var(--color-glass-500)]"
                          style={{ width: `${(value / BPS) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  ["Sessions", metrics.sessions.toLocaleString("en-US")],
                  ["Players", metrics.players.toLocaleString("en-US")],
                  ["Came back", `${metrics.returning.toLocaleString("en-US")}`],
                  ["Median session", `${Math.floor(metrics.medianSeconds / 60)}m ${metrics.medianSeconds % 60}s`],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-3.5"
                  >
                    <dt className="text-[11.5px] text-[var(--color-mist-700)]">{k}</dt>
                    <dd className="mt-1 font-mono text-[15px] text-[var(--color-mist-100)] tnum">
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          {mine && (
            <div className="rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-5">
              <p className="text-[11px] uppercase tracking-widest text-[var(--color-mist-700)]">
                Epoch {epoch}
              </p>
              <p className="mt-2 font-mono text-[34px] leading-none text-[var(--color-glass-400)] tnum">
                {mine.score}
              </p>
              <p className="mt-1 text-[12.5px] text-[var(--color-mist-500)]">
                score, out of {BPS.toLocaleString("en-US")} possible
              </p>

              <div className="mt-4 border-t border-[var(--color-ink-800)] pt-4">
                <p className="font-mono text-[24px] leading-none text-[var(--color-amber-400)] tnum">
                  ${Math.floor((POOL_USD[epoch] * mine.shareBps) / BPS).toLocaleString("en-US")}
                </p>
                <p className="mt-1 text-[12.5px] text-[var(--color-mist-500)]">
                  owed from this epoch, being {(mine.shareBps / 100).toFixed(2)}% of the pool
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-5">
            <h3 className="text-[13px] font-medium">Paid to</h3>
            <a
              href={`${EXPLORER}/address/${game.creatorWallet}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block break-all font-mono text-[11.5px] text-[var(--color-mist-300)] underline decoration-dotted hover:text-[var(--color-glass-300)]"
            >
              {game.creatorWallet}
            </a>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-[var(--color-mist-700)]">
              A live devnet address. Settlements for this game land here and can be read off
              the explorer without asking us anything.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-5">
            <h3 className="text-[13px] font-medium">Across epochs</h3>
            <ul className="mt-3 space-y-2">
              {history.map((h) => (
                <li key={h.epoch} className="flex items-baseline justify-between text-[12.5px]">
                  <span className="text-[var(--color-mist-500)]">Epoch {h.epoch}</span>
                  {h.row ? (
                    <span className="font-mono text-[var(--color-mist-300)] tnum">
                      rank {h.row.rank} of {h.size} · {(h.row.shareBps / 100).toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-[var(--color-mist-700)]">not yet launched</span>
                  )}
                </li>
              ))}
            </ul>
            {game.launchedEpoch > 1 && (
              <p className="mt-3 border-t border-[var(--color-ink-800)] pt-3 text-[11.5px] leading-relaxed text-[var(--color-mist-700)]">
                This game was playable before epoch {game.launchedEpoch} and was not ranked
                during that time. Testing with real players costs nothing here, because a
                game is scored from the epoch its author nominates rather than from the
                moment it first became readable.
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
