/**
 * Scout — Custom Plugin Entry Point
 */
import { type Plugin } from "@elizaos/core";
import { analyzeTokenAction } from "./actions/analyzeToken";

export const scoutPlugin: Plugin = {
  name: "scout-plugin",
  description: "Scout — Solana token due diligence agent",
  actions: [analyzeTokenAction],
  providers: [],
  evaluators: [],
};

export default scoutPlugin;
