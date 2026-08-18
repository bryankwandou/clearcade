"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cohort, INDEX } from "@/lib/data";
import { rankCohort, WEIGHTS_V1, BPS, type Weights } from "@/lib/rank";

const KEYS = ["reach", "retention", "depth", "rating"] as const;
type Key = (typeof KEYS)[number];

const LABEL: Record<Key, string> = {
  reach: "Reach",
  retention: "Came back",
  depth: "Session depth",
  rating: "Rating",
};

const EXPLAIN: Record<Key, string> = {
  reach: "How many sessions were opened, on a curve that flattens out so the biggest game does not simply own the page.",
  retention: "The share of players who came back the next day.",
  depth: "Median session length, up to thirty minutes.",
  rating: "What players scored it out of five.",
};

/**
 * The ranking, with the rule left unlocked.
 *
 * Every catalogue on the internet ranks by a formula like this one, and none
 * of them let you touch it. Pulling a slider here rewrites the order of the
 * page instantly, which is the fastest way to show what an operator quietly
 * holds: the power to decide who eats, exercised in a single number nobody
 * outside the building ever sees.
 *
 * Clearcade's answer is not that this power disappears. It is that the four
 * numbers are published, versioned, and committed on a public chain before
 * the ranking they produce goes out — so a change is a thing you can point
 * at, dated, rather than a month of wondering what you did wrong.
 */
export function RankLab({ epoch = 3 }: { epoch?: number }) {
  const [w, setW] = useState<Weights>(WEIGHTS_V1);
  const metrics = useMemo(() => cohort(epoch), [epoch]);

  const dirty = KEYS.some((k) => w[k] !== WEIGHTS_V1[k]);
  const total = KEYS.reduce((sum, k) => sum + w[k], 0);

  // The rule requires the weights to total one. Rather than reject a drag or
  // silently renormalise behind the visitor's back, the remaining three
  // weights absorb the change in proportion, so the set stays valid at every
  // frame and the slider under the cursor does exactly what it says.
  function set(key: Key, next: number) {
    const others = KEYS.filter((k) => k !== key);
    const pool = BPS - next;
    const otherTotal = others.reduce((sum, k) => sum + w[k], 0);

    const updated = { ...w, [key]: next } as Weights;
    if (otherTotal === 0) {
      const each = Math.floor(pool / others.length);
      others.forEach((k, i) => {
        updated[k] = i === 0 ? pool - each * (others.length - 1) : each;
      });
    } else {
      let handed = 0;
      others.forEach((k, i) => {
        const share =
          i === others.length - 1 ? pool - handed : Math.floor((pool * w[k]) / otherTotal);
        updated[k] = share;
        handed += share;
      });
    }
    setW(updated);
  }

  const ranked = useMemo(() => {
    // Guard the invariant rather than trusting the arithmetic above: an
    // off-by-one here would throw inside render and take the page down.
    if (total !== BPS) return [];
    return rankCohort(metrics, w);
  }, [metrics, w, total]);

  const baseline = useMemo(() => {
    const order = rankCohort(metrics, WEIGHTS_V1);
    return new Map(order.map((r) => [r.gameId, r.rank]));
  }, [metrics]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <div className="rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">The published weights</h3>
          <span className="font-mono text-[11px] text-[var(--color-mist-500)]">
            {dirty ? "edited" : "v1, in force"}
          </span>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-mist-500)]">
          Drag one. The catalogue on the right reorders as you go. This is the entire
          ranking rule — there is no second model underneath it.
        </p>

        <div className="mt-5 space-y-4">
          {KEYS.map((k) => (
            <div key={k}>
              <div className="flex items-baseline justify-between">
                <label htmlFor={`w-${k}`} className="text-[13px] font-medium">
                  {LABEL[k]}
                </label>
                <span
                  className={`font-mono text-[12px] tnum ${
                    w[k] !== WEIGHTS_V1[k]
                      ? "text-[var(--color-glass-400)]"
                      : "text-[var(--color-mist-500)]"
                  }`}
                >
                  {(w[k] / 100).toFixed(1)}%
                </span>
              </div>
              <input
                id={`w-${k}`}
                type="range"
                min={0}
                max={7000}
                step={100}
                value={w[k]}
                onChange={(e) => set(k, Number(e.target.value))}
                className="mt-2 w-full"
                aria-describedby={`d-${k}`}
              />
              <p id={`d-${k}`} className="mt-1.5 text-[11.5px] leading-snug text-[var(--color-mist-700)]">
                {EXPLAIN[k]}
              </p>
            </div>
          ))}
        </div>

        {dirty && (
          <button
            onClick={() => setW(WEIGHTS_V1)}
            className="mt-5 w-full rounded-lg border border-[var(--color-ink-600)] px-3 py-2 text-[13px] text-[var(--color-mist-300)] transition-colors hover:border-[var(--color-glass-600)] hover:text-[var(--color-mist-100)]"
          >
            Put the real weights back
          </button>
        )}

        <p className="mt-4 border-t border-[var(--color-ink-700)] pt-4 text-[11.5px] leading-relaxed text-[var(--color-mist-700)]">
          Nothing you do here changes what anybody else sees. The weights in force are the
          ones committed on chain for this epoch, and moving a slider does not move a
          payout.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Epoch {epoch} catalogue order</h3>
          <span className="font-mono text-[11px] text-[var(--color-mist-500)]">
            {ranked.length} games
          </span>
        </div>

        <ol className="mt-4 space-y-1">
          {ranked.map((r) => {
            const game = INDEX.get(r.gameId)!;
            const was = baseline.get(r.gameId) ?? r.rank;
            const moved = was - r.rank;

            return (
              <li
                key={r.gameId}
                className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--color-ink-850)]"
              >
                <span className="font-mono text-[12px] text-[var(--color-mist-500)] tnum">
                  {r.rank}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/game/${game.id}`}
                      className="truncate text-[13.5px] hover:text-[var(--color-glass-300)]"
                    >
                      {game.title}
                    </Link>
                    {moved !== 0 && (
                      <span
                        className={`shrink-0 font-mono text-[10.5px] ${
                          moved > 0 ? "text-[var(--color-glass-400)]" : "text-[var(--color-coral-400)]"
                        }`}
                      >
                        {moved > 0 ? `up ${moved}` : `down ${-moved}`}
                      </span>
                    )}
                  </div>
                  {/* The score bar is the score, not a decoration scaled to
                      look full. A game at 3,100 basis points draws at 31%. */}
                  <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-[var(--color-ink-800)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-glass-500)] transition-[width] duration-300 ease-out"
                      style={{ width: `${(r.score / BPS) * 100}%` }}
                    />
                  </div>
                </div>

                <span className="font-mono text-[12px] text-[var(--color-mist-300)] tnum">
                  {(r.shareBps / 100).toFixed(2)}%
                </span>
              </li>
            );
          })}
        </ol>

        <p className="mt-4 border-t border-[var(--color-ink-700)] pt-3 text-[11.5px] text-[var(--color-mist-700)]">
          The right-hand column is share of the epoch pool. One number sets both the order
          of this list and what each game is owed, so there is only one thing to argue
          about.
        </p>
      </div>
    </div>
  );
}
