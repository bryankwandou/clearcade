/**
 * The seed catalogue.
 *
 * These are sample games with sample telemetry, and the app says so wherever
 * it shows a number. Nothing is gained by dressing invented figures up as
 * real ones — the thing being demonstrated is that a published rule produces
 * a rank anybody can redo, and that holds whether the inputs came from a
 * million players or from this file.
 *
 * The wallets, on the other hand, are real. Every address below is a genuine
 * Ed25519 public key on the curve, so a devnet payout to any of them lands
 * rather than failing at signing time.
 */

import type { Metrics } from "./rank";

export type Category =
  | "Adventure"
  | "Simulation"
  | "Social"
  | "Survival"
  | "Racing"
  | "Puzzle"
  | "Roleplay"
  | "Tycoon";

export type Game = {
  id: string;
  title: string;
  creator: string;
  creatorWallet: string;
  category: Category;
  blurb: string;
  /**
   * The epoch this game asked to be ranked from.
   *
   * Before it, the game was in the open and playable but outside the
   * catalogue and outside the payout pool. Platforms that start scoring a
   * game the moment it is publicly readable punish the developer who tests
   * with real players, and the low retention from that testing follows the
   * game permanently. Here a creator says when the clock starts.
   */
  launchedEpoch: number;
  /** Two colour stops the thumbnail is drawn from. No image files. */
  hue: [number, number];
};

export const GAMES: Game[] = [
  {
    id: "kalibata-drift",
    title: "Kalibata Drift",
    creator: "Ayu Prasetyo",
    creatorWallet: "8EYCusYVBiSZaLTT6gFKVtASM3VzRSpcwByvaUT54oxP",
    category: "Racing",
    blurb: "Night racing through a city built from the streets its author grew up on.",
    launchedEpoch: 1,
    hue: [268, 322],
  },
  {
    id: "tide-office",
    title: "The Tide Office",
    creator: "Dela Kusuma",
    creatorWallet: "fhnz7FuhJ3Tg6rsftgJNoL2LW2sjpHv13xF6pW4ffuX",
    category: "Simulation",
    blurb: "You file weather reports for a coastline that keeps rearranging itself.",
    launchedEpoch: 1,
    hue: [188, 216],
  },
  {
    id: "gravel-league",
    title: "Gravel League",
    creator: "Marek Zielinski",
    creatorWallet: "8KH1fcMx47swkbzUiwTrvpdSwFiSReeQrCNvWSuuc3Vx",
    category: "Racing",
    blurb: "Sixteen drivers, one dirt circuit, and a repair bill after every heat.",
    launchedEpoch: 1,
    hue: [24, 46],
  },
  {
    id: "lantern-shift",
    title: "Lantern Shift",
    creator: "Nina Oyelaran",
    creatorWallet: "8iizPZJ1oLrbXmY6WBnitskdYUtcpkpnGNxvH5dr6eGC",
    category: "Adventure",
    blurb: "A lamplighter's round through a district that forgets its own streets.",
    launchedEpoch: 1,
    hue: [42, 12],
  },
  {
    id: "cold-harbour",
    title: "Cold Harbour",
    creator: "Tomas Bergqvist",
    creatorWallet: "8SGeV9Xd8fAXunY16iiwmckWLaJPJKycX9DQXuVqpKot",
    category: "Survival",
    blurb: "Winter fishing where the ice is a schedule, not a surface.",
    launchedEpoch: 1,
    hue: [200, 240],
  },
  {
    id: "verandah",
    title: "Verandah",
    creator: "Sana Iqbal",
    creatorWallet: "61MuBEx1gfUWfmqJXN4H3Z1gvonzya2UArisrGHsT8A2",
    category: "Social",
    blurb: "A house with no objective where people mostly sit and talk.",
    launchedEpoch: 1,
    hue: [96, 62],
  },
  {
    id: "spice-route",
    title: "Spice Route Holdings",
    creator: "Ravi Chandran",
    creatorWallet: "4kQPxRtbdA7RmP84V5yHPZkdHEqYqvRPX1NPzD1H9VXk",
    category: "Tycoon",
    blurb: "Freight, tariffs, and the long wait for a ship that may not arrive.",
    launchedEpoch: 1,
    hue: [34, 8],
  },
  {
    id: "polder",
    title: "Polder",
    creator: "Lotte de Vries",
    creatorWallet: "CC2W93ztL2y45YUNbSunERXoPR5jvQ16vvGuc5trMEQk",
    category: "Simulation",
    blurb: "Keep the water out. The water is patient and you are on a budget.",
    launchedEpoch: 1,
    hue: [166, 196],
  },
  {
    id: "hanabi-lane",
    title: "Hanabi Lane",
    creator: "Kenji Morita",
    creatorWallet: "A43dBSqRH9KCz9ZALJaqRqBEVBusHjmTtpudzGUDA1vZ",
    category: "Social",
    blurb: "A festival street that runs for one hour, every hour, forever.",
    launchedEpoch: 2,
    hue: [330, 288],
  },
  {
    id: "market-day",
    title: "Market Day",
    creator: "Amara Nwosu",
    creatorWallet: "BCaVjN7L31qXNXfScAWdtxyuSJ1VzF9NjCHzhcVdXM9m",
    category: "Tycoon",
    blurb: "Buy low at dawn, sell high by noon, and learn what everyone else paid.",
    launchedEpoch: 2,
    hue: [48, 26],
  },
  {
    id: "sampaguita",
    title: "Sampaguita",
    creator: "Bea Solano",
    creatorWallet: "ESAhsMH1UYz8bXrRkoznGAqpWkkDric8seohdRH1YRD7",
    category: "Roleplay",
    blurb: "Three generations of one household, played an evening at a time.",
    launchedEpoch: 2,
    hue: [312, 348],
  },
  {
    id: "qasr-puzzle",
    title: "The Qasr Rooms",
    creator: "Youssef Haddad",
    creatorWallet: "GGiaZ97B2eDmocAUfaRAz1bgvxyaedMLDCjNgHSXm8yc",
    category: "Puzzle",
    blurb: "Forty locked rooms and one key that is the wrong shape on purpose.",
    launchedEpoch: 2,
    hue: [258, 220],
  },
  {
    id: "azulejo",
    title: "Azulejo",
    creator: "Ines Ferreira",
    creatorWallet: "CUrjy5SBiM1uRpyYKyteBPETkt85Cx5FPtfgeEAB95x9",
    category: "Puzzle",
    blurb: "Tile a wall that judges your work in a language you slowly learn.",
    launchedEpoch: 2,
    hue: [210, 186],
  },
  {
    id: "wisla-nights",
    title: "Wisla Nights",
    creator: "Piotr Nowak",
    creatorWallet: "7cmCmyYp1wjeSrJLeceUhemiXhJ1GBtrL54PoH2mpSHg",
    category: "Adventure",
    blurb: "A river, a curfew, and a boat you are not supposed to have.",
    launchedEpoch: 3,
    hue: [222, 258],
  },
  {
    id: "shinrin",
    title: "Shinrin",
    creator: "Hana Takeda",
    creatorWallet: "GsJqrAJRKgS6CnKJ4G22g4B6XqmQZJufxxw3qNST6gzt",
    category: "Adventure",
    blurb: "Walk a forest that is mapped only by the people who walked it before.",
    launchedEpoch: 3,
    hue: [128, 96],
  },
  {
    id: "taiga-run",
    title: "Taiga Run",
    creator: "Dimitri Volkov",
    creatorWallet: "85nPTvgXpoCkZiJiNd7oANvYWx4rhy8V4NdQEUWjsnS7",
    category: "Survival",
    blurb: "Four hundred kilometres of forest and a radio that works twice a day.",
    launchedEpoch: 3,
    hue: [154, 190],
  },
];

export const INDEX = new Map(GAMES.map((g) => [g.id, g]));

export const CATEGORIES: Category[] = [
  "Adventure",
  "Simulation",
  "Social",
  "Survival",
  "Racing",
  "Puzzle",
  "Roleplay",
  "Tycoon",
];

/** Epochs that have closed and been scored. */
export const EPOCHS = [1, 2, 3] as const;

/**
 * The payout pool for each closed epoch, in whole US dollars.
 *
 * Devnet cannot move dollars, so the settlement script converts at a stated
 * rate and writes that rate into the receipt. Nobody should read a devnet
 * transfer as a real payment, and the receipt makes it hard to.
 */
export const POOL_USD: Record<number, number> = {
  1: 24_000,
  2: 31_500,
  3: 38_000,
};

/**
 * Sample telemetry, generated rather than typed out.
 *
 * The numbers come from a small deterministic hash of the game id and the
 * epoch, so the catalogue looks like a catalogue instead of sixteen rows of
 * the same shape, and so every visitor, script and CI run sees identical
 * figures. Identical figures matter more than realistic ones here: the page
 * invites you to recompute the ranking, and that invitation is worthless if
 * the inputs move between page loads.
 */
function seeded(gameId: string, epoch: number, salt: number): number {
  let h = 2_166_136_261 ^ (epoch * 7919 + salt * 104_729);
  for (let i = 0; i < gameId.length; i += 1) {
    h ^= gameId.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  return Math.abs(h >>> 0);
}

const pick = (id: string, e: number, salt: number, lo: number, hi: number) =>
  lo + (seeded(id, e, salt) % (hi - lo + 1));

export function metricsFor(game: Game, epoch: number): Metrics | null {
  // A game outside its own launch window has no ranked metrics at all. It is
  // not scored as a zero, which would drag a real average down; it is simply
  // absent from the cohort.
  if (epoch < game.launchedEpoch) return null;

  const age = epoch - game.launchedEpoch;
  const players = pick(game.id, epoch, 1, 900, 46_000) + age * 2_400;
  const sessions = players * pick(game.id, epoch, 2, 2, 7);
  const returning = Math.floor((players * pick(game.id, epoch, 3, 12, 68)) / 100);
  const medianSeconds = pick(game.id, epoch, 4, 140, 2_400);
  const ratingBps = pick(game.id, epoch, 5, 5_600, 9_700);

  return { gameId: game.id, sessions, players, returning, medianSeconds, ratingBps };
}

export function cohort(epoch: number): Metrics[] {
  return GAMES.map((g) => metricsFor(g, epoch)).filter((m): m is Metrics => m !== null);
}

/** The wallet the demo dashboard presents as "yours". */
export const DEMO_CREATOR = "Ayu Prasetyo";
