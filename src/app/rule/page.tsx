import { Section } from "../page";
import { CommitCheck } from "@/components/commit-check";
import { canonicalInputs } from "@/lib/chain";
import { cohort, INDEX } from "@/lib/data";
import {
  BPS,
  DEPTH_CAP,
  HALF_REACH,
  WEIGHTS_V1,
  components,
  rankCohort,
} from "@/lib/rank";

export const metadata = {
  title: "The ranking rule — Clearcade",
  description:
    "The complete specification of how Clearcade orders its catalogue and splits its payout pool, with the arithmetic worked out on a real game.",
};

/**
 * The specification.
 *
 * Written so a creator can check their own placement with a calculator. Every
 * platform this argues with has a page like this that stops at adjectives:
 * quality, engagement, relevance. The difference here is that the adjectives
 * are replaced by numbers and the numbers are the ones actually in the code.
 */
export default function RulePage() {
  const epoch = 3;
  const metrics = cohort(epoch);
  const ranked = rankCohort(metrics, WEIGHTS_V1);

  // The worked example uses whatever placed second, so the page does not read
  // as a victory lap for the top game.
  const example = ranked[1];
  const exampleMetrics = metrics.find((m) => m.gameId === example.gameId)!;
  const exampleGame = INDEX.get(example.gameId)!;
  const c = components(exampleMetrics);

  const table = canonicalInputs(epoch, metrics);

  return (
    <main className="pb-10">
      <Section
        eyebrow="Specification"
        title="How a game is ranked, in full"
        lede="Four measurements, four weights, one score. No second model, no editorial pass, no promoted slots. If this page and the catalogue ever disagree, this page is wrong and it is a bug."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              k: "Reach",
              w: WEIGHTS_V1.reach,
              formula: `sessions / (sessions + ${HALF_REACH.toLocaleString("en-US")})`,
              note: `Saturating rather than linear, so a game needs ${HALF_REACH.toLocaleString("en-US")} sessions for half marks and cannot buy the top of the page with volume alone.`,
            },
            {
              k: "Came back",
              w: WEIGHTS_V1.retention,
              formula: "returning / players",
              note: "Players who opened the game again the next day, over players who opened it at all. A game nobody opened scores zero here rather than dividing by zero.",
            },
            {
              k: "Session depth",
              w: WEIGHTS_V1.depth,
              formula: `min(median seconds, ${DEPTH_CAP}) / ${DEPTH_CAP}`,
              note: `Median session length up to ${DEPTH_CAP / 60} minutes. Long sessions count in a game's favour here, which is the opposite of how most ranking models read them.`,
            },
            {
              k: "Rating",
              w: WEIGHTS_V1.rating,
              formula: "player rating, out of five",
              note: "The smallest weight of the four, because ratings are the easiest of these numbers for a determined group of people to move.",
            },
          ].map((x) => (
            <div
              key={x.k}
              className="rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-5"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-[14px] font-medium">{x.k}</h3>
                <span className="font-mono text-[13px] text-[var(--color-glass-400)] tnum">
                  {(x.w / 100).toFixed(0)}%
                </span>
              </div>
              <p className="mt-3 rounded-lg bg-[var(--color-ink-950)] px-2.5 py-2 font-mono text-[11.5px] leading-relaxed text-[var(--color-mist-300)]">
                {x.formula}
              </p>
              <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--color-mist-500)]">
                {x.note}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-5">
          <h3 className="text-[14px] font-medium">Everything is an integer</h3>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-[var(--color-mist-500)]">
            Each component is scaled to basis points, meaning a whole number from 0 to
            10,000, and every division throws away the remainder rather than rounding. That
            is not fussiness. An invitation to recompute the ranking is worthless if two
            honest implementations can disagree in the last digit, and floating point
            guarantees they eventually will. Anyone reimplementing this rule in Python or
            Rust with integer arithmetic lands on identical bytes, which is what makes the
            hash on the chain mean something.
          </p>
          <p className="mt-3 rounded-lg bg-[var(--color-ink-950)] px-3 py-2.5 font-mono text-[12px] leading-relaxed text-[var(--color-mist-300)]">
            score = (reach × {WEIGHTS_V1.reach} + came_back × {WEIGHTS_V1.retention} + depth
            × {WEIGHTS_V1.depth} + rating × {WEIGHTS_V1.rating}) / {BPS}
          </p>
        </div>
      </Section>

      <Section
        eyebrow="Worked through"
        title={`${exampleGame.title}, epoch ${epoch}`}
        lede="The same arithmetic the catalogue ran, with the intermediate values left in. Nothing below is rounded for presentation."
      >
        <div className="overflow-hidden rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)]">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-ink-800)] text-left text-[11px] uppercase tracking-widest text-[var(--color-mist-700)]">
                <th className="px-5 py-3 font-normal">Component</th>
                <th className="px-5 py-3 font-normal">Measured</th>
                <th className="px-5 py-3 font-normal">Arithmetic</th>
                <th className="px-5 py-3 text-right font-normal">Basis points</th>
                <th className="px-5 py-3 text-right font-normal">Weighted</th>
              </tr>
            </thead>
            <tbody className="text-[var(--color-mist-300)]">
              {[
                {
                  k: "Reach",
                  measured: `${exampleMetrics.sessions.toLocaleString("en-US")} sessions`,
                  math: `10000 × ${exampleMetrics.sessions} / (${exampleMetrics.sessions} + ${HALF_REACH})`,
                  bps: c.reach,
                  w: WEIGHTS_V1.reach,
                },
                {
                  k: "Came back",
                  measured: `${exampleMetrics.returning.toLocaleString("en-US")} of ${exampleMetrics.players.toLocaleString("en-US")}`,
                  math: `10000 × ${exampleMetrics.returning} / ${exampleMetrics.players}`,
                  bps: c.retention,
                  w: WEIGHTS_V1.retention,
                },
                {
                  k: "Session depth",
                  measured: `${exampleMetrics.medianSeconds}s median`,
                  math: `10000 × min(${exampleMetrics.medianSeconds}, ${DEPTH_CAP}) / ${DEPTH_CAP}`,
                  bps: c.depth,
                  w: WEIGHTS_V1.depth,
                },
                {
                  k: "Rating",
                  measured: `${(exampleMetrics.ratingBps / 2000).toFixed(2)} of 5`,
                  math: "taken as given",
                  bps: c.rating,
                  w: WEIGHTS_V1.rating,
                },
              ].map((r) => (
                <tr key={r.k} className="border-b border-[var(--color-ink-800)]">
                  <td className="px-5 py-3">{r.k}</td>
                  <td className="px-5 py-3 text-[var(--color-mist-500)]">{r.measured}</td>
                  <td className="px-5 py-3 font-mono text-[11.5px] text-[var(--color-mist-700)]">
                    {r.math}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tnum">{r.bps}</td>
                  <td className="px-5 py-3 text-right font-mono tnum">
                    {Math.floor((r.bps * r.w) / BPS)}
                  </td>
                </tr>
              ))}
              <tr className="bg-[var(--color-ink-850)]">
                <td className="px-5 py-3 font-medium" colSpan={4}>
                  Score
                </td>
                <td className="px-5 py-3 text-right font-mono text-[var(--color-glass-400)] tnum">
                  {example.score}
                </td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-medium" colSpan={4}>
                  Rank {example.rank} of {ranked.length}, and share of the pool
                </td>
                <td className="px-5 py-3 text-right font-mono text-[var(--color-amber-400)] tnum">
                  {(example.shareBps / 100).toFixed(2)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        eyebrow="The committed bytes"
        title="The exact string that gets hashed"
        lede="Rows sorted by game id, fields comma separated in a fixed order, rows newline separated, no trailing newline. Copy it, hash it with any tool you like, and compare it to what is on the chain."
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_minmax(0,420px)]">
          <div className="overflow-hidden rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-950)]">
            <div className="border-b border-[var(--color-ink-800)] px-4 py-2.5 font-mono text-[11px] text-[var(--color-mist-700)]">
              epoch, then gameId,sessions,players,returning,medianSeconds,ratingBps
            </div>
            <pre className="max-h-[420px] overflow-auto p-4 font-mono text-[11.5px] leading-relaxed text-[var(--color-mist-300)]">
              {table}
            </pre>
          </div>
          <CommitCheck epoch={epoch} />
        </div>
      </Section>

      <Section
        eyebrow="What this rule does not do"
        title="The honest limits"
        lede="A specification that only lists its strengths is marketing. These are the places where a determined operator or a determined creator could still cause trouble."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              head: "It commits inputs, not their truth",
              body: "The hash proves the numbers behind the ranking are the numbers committed beforehand. It does not prove those numbers describe real people. Telemetry that is wrong before it is hashed is wrong after. Making it verifiable at the source needs attested session receipts signed by players, which is the next thing to build and is not built.",
            },
            {
              head: "Sessions can be manufactured",
              body: "Reach saturates, which limits what a bot farm buys, and depth and retention are harder to fake convincingly than a session count. That raises the cost of the attack rather than ending it. Any platform claiming otherwise is not counting carefully.",
            },
            {
              head: "The weights can still change",
              body: "Clearcade sets them. What it cannot do is change them quietly or backdate the change, because each epoch's weights are committed with its inputs. The power stays; the deniability goes.",
            },
          ].map((x) => (
            <div
              key={x.head}
              className="rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-5"
            >
              <h3 className="text-[14px] font-medium">{x.head}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--color-mist-500)]">
                {x.body}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
