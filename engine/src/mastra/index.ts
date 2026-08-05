// Mastra instance wiring. The advisory anomaly agent (FR-11..FR-14) joins
// this registration once it exists — the deterministic workflow doesn't need
// it to run.
import { Mastra } from "@mastra/core/mastra";
import { rebalanceWorkflow } from "./workflows/rebalance.workflow.js";

export const mastra = new Mastra({
  workflows: { rebalanceWorkflow },
});
