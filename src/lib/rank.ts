/**
 * The ranking rule.
 *
 * On most user-made game platforms the order of the catalogue is the single
 * most valuable thing the operator controls and the single thing it explains
 * least. A creator watching their traffic fall cannot tell whether players
 * lost interest, a competitor bought placement, or the operator quietly
 * reweighted something overnight. So they guess, and change thumbnails.
 *
 * Everything here is arithmetic a creator can redo on paper. Four inputs,
 * four published weights, one number out. The weights live in the epoch
 * record rather than in this file, so a change to them is a change to a
 * document that was already committed and timestamped somewhere Clearcade
 * cannot reach back into.
 *
 * Every value is an integer in basis points and every division truncates.
 * That is deliberate and it is the whole reason the recomputation is worth
 * anything: floating point would let two honest implementations disagree in
 * the last digit, and a rank that cannot be reproduced exactly cannot be
 * audited at all. Anyone reimplementing this in Python or Rust with integer
 * arithmetic will land on identical bytes.
 */

export const BPS = 10_000;

/**
 * Sessions needed to score half marks on reach.
 *
 * Reach saturates rather than growing without bound, so a game with ten
 * million sessions does not simply own the top of every list forever. The
 * curve is sessions / (sessions + HALF_REACH), which needs no logarithm and
 * therefore no library that might round differently on another machine.
 */
export const HALF_REACH = 25_000;

/** Median session length, in seconds, that earns full marks for depth. */
export const DEPTH_CAP = 1_800;

export type Weights = {
  reach: number;
  retention: number;
  depth: number;
  rating: number;
};

/**
 * The weights in force. They must total exactly one, expressed in basis
 * points, and `assertWeights` refuses anything else — a set that sums to
 * 9,999 would still produce a plausible-looking leaderboard, which is the
 * kind of error that goes unnoticed for a year.
 *
 * Depth carries more weight here than on the platforms this is arguing with,
 * where a long session that ends is read as a player giving up rather than a
 * player who stayed. Games built to be played for an hour should not have to
 * pretend to be games built to be played for four minutes.
 */
export const WEIGHTS_V1: Weights = {
  reach: 3_000,
  retention: 3_000,
  depth: 2_500,
  rating: 1_500,
};

export function assertWeights(w: Weights) {
  const total = w.reach + w.retention + w.depth + w.rating;
  if (total !== BPS) {
    throw new Error(
      `Weights total ${total} basis points and must total ${BPS}. A set that does not sum to one still ranks, which is why this throws instead of normalising.`,
    );
  }
}

/** What a game did in one epoch. Counts and seconds, nothing derived. */
export type Metrics = {
  gameId: string;
  /** Sessions opened. */
  sessions: number;
  /** Distinct players who opened at least one session. */
  players: number;
  /** Of those players, how many came back the following day. */
  returning: number;
  /** Median session length in whole seconds. */
  medianSeconds: number;
  /** Player rating, in basis points, so four stars out of five is 8,000. */
  ratingBps: number;
};

export type Components = {
  reach: number;
  retention: number;
  depth: number;
  rating: number;
};

/**
 * The four components, each already scaled to basis points.
 *
 * Retention is guarded against a zero player count rather than allowed to
 * produce a division by zero: a game nobody opened has no retention to
 * report, and reporting it as perfect would put empty games at the top.
 */
export function components(m: Metrics): Components {
  const reach = Math.floor((BPS * m.sessions) / (m.sessions + HALF_REACH));

  const retention =
    m.players > 0 ? Math.floor((BPS * Math.min(m.returning, m.players)) / m.players) : 0;

  const depth = Math.floor((BPS * Math.min(m.medianSeconds, DEPTH_CAP)) / DEPTH_CAP);

  const rating = Math.max(0, Math.min(BPS, Math.floor(m.ratingBps)));

  return { reach, retention, depth, rating };
}

/**
 * One score, in basis points, between 0 and 10,000.
 *
 * The final division truncates, so the score is the largest whole basis point
 * the components support and never rounds up into a number the inputs did not
 * earn.
 */
export function score(m: Metrics, w: Weights = WEIGHTS_V1): number {
  assertWeights(w);
  const c = components(m);
  return Math.floor(
    (c.reach * w.reach + c.retention * w.retention + c.depth * w.depth + c.rating * w.rating) /
      BPS,
  );
}

export type Ranked = {
  gameId: string;
  score: number;
  components: Components;
  rank: number;
  /** Share of the epoch payout pool, in basis points. */
  shareBps: number;
};

/**
 * Rank a cohort and cut the pool along the same numbers.
 *
 * Visibility and money come out of one function on purpose. Platforms that
 * rank by one rule and pay by another can always explain a bad month as the
 * other rule's fault, and a creator has no way to check either. Here the
 * number that decides where a game sits on the page is the number that
 * decides what it is owed, so there is exactly one thing to argue about.
 *
 * Ties break on game id. Not because that is fair, but because it is stated:
 * an unstated tiebreak is a discretionary slot, and discretionary slots are
 * the thing this is trying to remove.
 */
export function rankCohort(metrics: Metrics[], w: Weights = WEIGHTS_V1): Ranked[] {
  assertWeights(w);

  const scored = metrics.map((m) => ({
    gameId: m.gameId,
    score: score(m, w),
    components: components(m),
  }));

  const total = scored.reduce((sum, s) => sum + s.score, 0);

  scored.sort((a, b) => (b.score - a.score) || a.gameId.localeCompare(b.gameId));

  return scored.map((s, i) => ({
    ...s,
    rank: i + 1,
    shareBps: total > 0 ? Math.floor((BPS * s.score) / total) : 0,
  }));
}

/**
 * Split a pool across a ranked cohort, to the lamport.
 *
 * Truncating every share leaves a remainder that has to go somewhere. It goes
 * to the top-ranked game, and it is returned separately so the number is
 * visible rather than folded into a payout and passed off as earned. The
 * remainder is smaller than the number of games, so this is pennies — but a
 * split that silently loses lamports is a split nobody should trust with
 * larger numbers.
 */
export function splitPool(
  ranked: Ranked[],
  poolLamports: number,
): { payouts: Map<string, number>; remainder: number } {
  const payouts = new Map<string, number>();
  let handed = 0;

  for (const r of ranked) {
    const amount = Math.floor((poolLamports * r.shareBps) / BPS);
    payouts.set(r.gameId, amount);
    handed += amount;
  }

  const remainder = poolLamports - handed;
  if (remainder > 0 && ranked.length > 0) {
    const top = ranked[0].gameId;
    payouts.set(top, (payouts.get(top) ?? 0) + remainder);
  }

  return { payouts, remainder };
}
