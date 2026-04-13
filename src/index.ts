/**
 * Scout — Custom Plugin Entry Point
 */
import { type Plugin, type Memory } from "@elizaos/core";

const placeholderAction = {
  name: "SCOUT_PLACEHOLDER",
  description: "Placeholder action. Real action added in next step.",
  similes: ["PLACEHOLDER"],
  validate: async () => true,
  handler: async (_runtime: unknown, message: Memory): Promise<void> => {
    const text = message.content?.text ?? "";
    console.log("[Scout] placeholder triggered:", text);
  },
  examples: [],
};

export const scoutPlugin: Plugin = {
  name: "scout-plugin",
  description: "Scout — Solana token due diligence agent",
  actions: [placeholderAction],
  providers: [],
  evaluators: [],
};

export default scoutPlugin;