import Link from "next/link";
import { RankLab } from "@/components/rank-lab";
import { CommitCheck } from "@/components/commit-check";
import { Thumb } from "@/components/thumb";
import { GAMES, POOL_USD, cohort } from "@/lib/data";
import { rankCohort, WEIGHTS_V1, HALF_REACH, DEPTH_CAP } from "@/lib/rank";

export default function Home() {
  const epoch = 3;
  const ranked = rankCohort(cohort(epoch), WEIGHTS_V1);
  const top = ranked.slice(0, 6);

  return (
    <main>
      <Hero />
      <Problem />

      <Section
        id="lab"
        eyebrow="The rule, unlocked"
        title="Move the weights and watch who eats"
        lede="Every catalogue on the internet ranks by a formula close to this one. None of them let you touch it. Four sliders is the whole difference between a platform you can argue with and one you can only guess at."
      >
        <RankLab epoch={epoch} />
      </Section>

      <Section
        id="commit"
        eyebrow="Why a chain is here at all"
        title="A hash, written down somewhere we cannot reach"
        lede="Publishing the rule is not enough on its own. An operator that publishes a rule can still change last month's numbers and say they were always that way. So before a ranking goes out, the inputs behind it are hashed and that hash is written to Solana, where the ordering is not ours to rewrite."
      >
        <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
          <CommitCheck epoch={epoch} />
          <Sequence />
        </div>
      </Section>

      <Section
        id="catalogue"
        eyebrow={`Epoch ${epoch}`}
        title="The catalogue, in the order the rule produced"
        lede={`Sixteen games, ${POOL_USD[epoch].toLocaleString("en-US")} dollars in the pool, one number deciding both the order of this grid and what each creator is owed.`}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((r, i) => {
            const game = GAMES.find((g) => g.id === r.gameId)!;
            return (
              <Link
                key={r.gameId}
                href={`/game/${game.id}`}
                className="rise group overflow-hidden rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] transition-colors hover:border-[var(--color-glass-600)]"
                style={{ animationDelay: `${i * 55}ms` }}
              >
                <div className="relative">
                  <Thumb game={game} className="aspect-[16/9] w-full" />
                  <span className="absolute left-3 top-3 rounded-md bg-[var(--color-ink-950)]/80 px-2 py-0.5 font-mono text-[11px] backdrop-blur">
                    {r.rank}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="truncate text-[14px] font-medium group-hover:text-[var(--color-glass-300)]">
                      {game.title}
                    </h3>
                    <span className="shrink-0 font-mono text-[12px] text-[var(--color-amber-400)] tnum">
                      {(r.shareBps / 100).toFixed(2)}%
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[12.5px] text-[var(--color-mist-500)]">
                    {game.creator} · {game.category}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/catalogue"
            className="inline-block rounded-xl border border-[var(--color-ink-600)] px-5 py-2.5 text-[13px] text-[var(--color-mist-300)] transition-colors hover:border-[var(--color-glass-600)] hover:text-[var(--color-mist-100)]"
          >
            See all sixteen, with every input
          </Link>
        </div>
      </Section>

      <Payout />
      <Closing />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--color-ink-800)]">
      {/* Two soft fields of colour, drifting slowly. They are doing the work a
          hero image would do on a catalogue site without pretending to be
          screenshots of games that do not exist. */}
      <div
        className="drift pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full opacity-[0.16] blur-3xl"
        style={{ background: "radial-gradient(circle, #22b4ca, transparent 68%)" }}
      />
      <div
        className="drift pointer-events-none absolute -right-32 top-24 h-[460px] w-[460px] rounded-full opacity-[0.12] blur-3xl"
        style={{ background: "radial-gradient(circle, #f0b544, transparent 68%)", animationDelay: "-6s" }}
      />

      <div className="relative mx-auto max-w-[1240px] px-5 pb-20 pt-20 sm:pt-28">
        <p className="rise font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-glass-400)]">
          A catalogue of player-made games
        </p>

        <h1
          className="rise mt-5 max-w-4xl text-[38px] font-semibold leading-[1.06] tracking-[-0.03em] sm:text-[58px]"
          style={{ animationDelay: "60ms" }}
        >
          The ranking that decides who gets seen is published in full.
          <span className="block text-[var(--color-mist-500)]">
            You can redo the arithmetic yourself.
          </span>
        </h1>

        <p
          className="rise mt-6 max-w-2xl text-[16px] leading-relaxed text-[var(--color-mist-300)]"
          style={{ animationDelay: "120ms" }}
        >
          On every large platform for player-made games, the order of the catalogue decides
          which creators earn a living, and the rule behind that order is a secret. When
          traffic collapses, nobody can tell you whether players left, a rival bought
          placement, or the model changed overnight. Clearcade publishes the rule, commits
          the numbers to Solana before the ranking goes out, and pays out along the same
          figures.
        </p>

        <div className="rise mt-9 flex flex-wrap gap-3" style={{ animationDelay: "180ms" }}>
          <Link
            href="#lab"
            className="rounded-xl bg-[var(--color-glass-500)] px-5 py-3 text-[14px] font-medium text-[var(--color-ink-950)] transition-colors hover:bg-[var(--color-glass-400)]"
          >
            Move the weights
          </Link>
          <Link
            href="#commit"
            className="rounded-xl border border-[var(--color-ink-600)] px-5 py-3 text-[14px] text-[var(--color-mist-300)] transition-colors hover:border-[var(--color-glass-600)] hover:text-[var(--color-mist-100)]"
          >
            Check a hash on chain
          </Link>
        </div>

        <dl
          className="rise mt-14 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4"
          style={{ animationDelay: "240ms" }}
        >
          {[
            ["4", "inputs, all published"],
            ["0", "discretionary slots"],
            ["1", "number sets rank and pay"],
            ["0", "countries excluded"],
          ].map(([n, label]) => (
            <div key={label}>
              <dd className="font-mono text-[26px] text-[var(--color-glass-400)] tnum">{n}</dd>
              <dt className="mt-1 text-[12.5px] leading-snug text-[var(--color-mist-500)]">
                {label}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Problem() {
  const items = [
    {
      head: "You cannot tell what went wrong",
      body: "A studio watching its traffic fall has no way to separate weaker retention from a seasonal dip, a competitor's paid placement, a moderation action, or an adjustment to the ranking model. So they change the thumbnail, then the icon, then the reward loop, and never learn which one mattered.",
    },
    {
      head: "Long games are punished for being long",
      body: "Ranking models widely read a completed hour-long session as lower intent than a player who returned twice for four minutes. Games built to be lived in lose to games built to be checked, and the developers of the first kind are told nothing about why.",
    },
    {
      head: "Testing in public poisons the record",
      body: "Publish to test with real players and the low retention from that testing is recorded, kept, and held against the game after launch. Responsible playtesting becomes a thing that costs you, permanently.",
    },
    {
      head: "Getting paid depends on where you were born",
      body: "Cashing out means clearing a fixed earnings floor, in a supported country, under terms the platform can change at will and eligibility it decides alone. A creator in Jakarta with the same numbers as one in Los Angeles does not have the same options.",
    },
  ];

  return (
    <Section
      eyebrow="What this is arguing with"
      title="Four complaints, none of them exotic"
      lede="These are the ordinary, documented grievances of people who make games on somebody else's platform. Clearcade is a direct answer to each, and the answers are structural rather than promised."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((it, i) => (
          <div
            key={it.head}
            className="rise rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <h3 className="text-[14.5px] font-medium">{it.head}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-mist-500)]">
              {it.body}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Sequence() {
  const steps = [
    {
      n: "01",
      head: "The epoch closes",
      body: "Sessions, returning players, median session length and ratings are totalled for every game that asked to be ranked this period.",
    },
    {
      n: "02",
      head: "The table is hashed",
      body: "Rows sorted by game id, fields in a fixed order, integers only. One SHA-256 over the result. The layout is documented so anyone can reproduce the byte string exactly.",
    },
    {
      n: "03",
      head: "The hash goes to Solana",
      body: "A memo transaction carrying the hash, the four weights and the pool size. From that point the numbers are dated by a party with no stake in the outcome.",
    },
    {
      n: "04",
      head: "Then, and only then, the ranking publishes",
      body: "The order and the payouts both fall out of the committed table. Editing it afterwards breaks the hash for every visitor at once.",
    },
  ];

  return (
    <ol className="space-y-2.5">
      {steps.map((s) => (
        <li
          key={s.n}
          className="flex gap-4 rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-4"
        >
          <span className="font-mono text-[12px] text-[var(--color-glass-500)]">{s.n}</span>
          <div>
            <h4 className="text-[13.5px] font-medium">{s.head}</h4>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-mist-500)]">
              {s.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Payout() {
  return (
    <Section
      eyebrow="The money"
      title="Paid to a wallet, on the same number that set the rank"
      lede="Splitting visibility from payment gives an operator two rules and a creator nothing to check. Here the share of the pool is the score, and the receipt names the commitment it settles against."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            head: "No earnings floor",
            body: "A game owed forty cents is paid forty cents. There is no threshold to clear before the money becomes yours, because the threshold exists to hold float, not to help you.",
          },
          {
            head: "No country list",
            body: "Settlement is a transfer to an address. An address does not have a passport, and Clearcade does not get to decide which ones deserve one.",
          },
          {
            head: "A receipt that points somewhere",
            body: "Each payout transaction names the epoch commitment it pays against, so the amount can be traced back to the exact table it was computed from.",
          },
        ].map((c, i) => (
          <div
            key={c.head}
            className="rise rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <h3 className="text-[14.5px] font-medium text-[var(--color-amber-300)]">{c.head}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-mist-500)]">
              {c.body}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-5 rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-850)] p-4 text-[12.5px] leading-relaxed text-[var(--color-mist-500)]">
        Clearcade runs on devnet, where SOL is free and worth nothing. Payouts are scaled
        by a stated factor and that factor is written into every receipt, so a devnet
        transfer cannot be mistaken for a real one. The catalogue and its telemetry are
        sample data. The ranking rule, the commitments, the transfers and the arithmetic
        are not.
      </p>
    </Section>
  );
}

function Closing() {
  return (
    <section className="mx-auto max-w-[1240px] px-5 pt-8">
      <div className="rounded-3xl border border-[var(--color-ink-700)] bg-gradient-to-br from-[var(--color-ink-900)] to-[var(--color-ink-950)] p-8 sm:p-12">
        <h2 className="max-w-2xl text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[36px]">
          Reach saturates at {HALF_REACH.toLocaleString("en-US")} sessions. Depth tops out
          at {DEPTH_CAP / 60} minutes. Now you know as much as we do.
        </h2>
        <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-[var(--color-mist-300)]">
          That sentence is not a marketing line, it is the specification. Everything the
          ranking does is on the rule page, in numbers, with the arithmetic written out.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/rule"
            className="rounded-xl bg-[var(--color-glass-500)] px-5 py-3 text-[14px] font-medium text-[var(--color-ink-950)] transition-colors hover:bg-[var(--color-glass-400)]"
          >
            Read the rule
          </Link>
          <Link
            href="/studio"
            className="rounded-xl border border-[var(--color-ink-600)] px-5 py-3 text-[14px] text-[var(--color-mist-300)] transition-colors hover:border-[var(--color-glass-600)] hover:text-[var(--color-mist-100)]"
          >
            See a creator's side
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-[1240px] scroll-mt-20 px-5 pt-20">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-glass-400)]">
        {eyebrow}
      </p>
      <h2 className="mt-3 max-w-3xl text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">
        {title}
      </h2>
      {lede && (
        <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-[var(--color-mist-500)]">
          {lede}
        </p>
      )}
      <div className="mt-8">{children}</div>
    </section>
  );
}
