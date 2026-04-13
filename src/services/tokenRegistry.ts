/**
 * Static registry of well-known Solana token symbols → mint addresses.
 * Curated list — no external API dependency.
 */

const TOKEN_REGISTRY = new Map<string, string>([
  ["SOL", "So11111111111111111111111111111111111111112"],
  ["USDC", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
  ["USDT", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"],
  ["BONK", "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"],
  ["WIF", "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm"],
  ["JUP", "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"],
  ["JTO", "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL"],
  ["PYTH", "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3"],
  ["RENDER", "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof"],
  ["WEN", "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk"],
  ["POPCAT", "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"],
  ["MEW", "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5"],
  ["PONKE", "5z3EqYQo9HiCEs3R84RCDMu2n7anpDMxRhdK8PSWmrRC"],
  ["MOODENG", "ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY"],
  ["GOAT", "CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump"],
  ["MICHI", "5mbK36SZ7J19An8jFochhQS4of8g6BwUjbeCSxBSoWdp"],
  ["PNUT", "2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump"],
  ["CHILLGUY", "Df6yfrKC8kZE3KNkrHERKzAetSxbrWeniQfyJY4Jpump"],
  ["FWOG", "A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump"],
  ["MOTHER", "3S8qX1MsMqRbiwKg2cQyx7nis1oHMgaCuc9c4VfvVdPN"],
  ["PENGU", "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv"],
  ["TRUMP", "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN"],
  ["MELANIA", "FUAfBo2jgks6gB4Z4LfZkqSZgzNucisEHqnNebaRxM1P"],
  ["AI16Z", "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC"],
  ["FARTCOIN", "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump"],
  ["GRIFFAIN", "KENJSUYLASHUMfHyy5o4Hp2FdNqZg1AsUPhfH2kYvEP"],
  ["ARC", "61V8vBaqAGMpgDQi4JcAwo1dmBGHsyhzodcPqnEVpump"],
  ["ZEREBRO", "8x5VqbHA8D7NkD52uNuS5nnt3PwA8pLD34ymskeSo2Wn"],
  ["AVA", "DKu9kykSfbN5LBfFXtNNDPaX35o4Fv6vJ9FKk7pZpump"],
]);

/** All known symbols, for use in regex matching. */
export const KNOWN_SYMBOLS: string[] = [...TOKEN_REGISTRY.keys()];

/** Resolve a token symbol to its mint address. Returns null if unknown. */
export function resolveSymbolToMint(symbol: string): string | null {
  return TOKEN_REGISTRY.get(symbol.toUpperCase()) ?? null;
}
