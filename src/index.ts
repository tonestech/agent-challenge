/**
 * Scout — Custom Plugin Entry Point
 */
import { type Plugin } from "@elizaos/core";
import { analyzeTokenAction } from "./actions/analyzeToken";
import { analyzeRoute, analyzeOptionsRoute } from "./api/analyze";

export const scoutPlugin: Plugin = {
  name: "scout-plugin",
  description: "Scout — Solana token due diligence agent",
  actions: [analyzeTokenAction],
  routes: [analyzeRoute, analyzeOptionsRoute],
  providers: [],
  evaluators: [],
};

export default scoutPlugin;
