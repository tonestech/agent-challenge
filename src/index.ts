import { type Plugin, type Project, type ProjectAgent, type IAgentRuntime } from "@elizaos/core";
import openaiPlugin from "@elizaos/plugin-openai";
import { analyzeTokenAction } from "./actions/analyzeToken";
import { analyzeRoute, analyzeOptionsRoute } from "./api/analyze";
import character from "../characters/agent.character.json" with { type: "json" };

const scoutPlugin: Plugin = {
  name: "scout-plugin",
  description: "Scout — Solana token due diligence agent",
  actions: [analyzeTokenAction],
  routes: [analyzeRoute, analyzeOptionsRoute],
  providers: [],
  evaluators: [],
};

export const projectAgent: ProjectAgent = {
  character: character as any,
  plugins: [openaiPlugin],
  init: async (runtime: IAgentRuntime) => {
    await runtime.registerPlugin(scoutPlugin);
  },
};

const project: Project = {
  agents: [projectAgent],
};

export default project;
