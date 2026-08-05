// Manual trigger for the rebalance workflow (PRD milestone 1: "single
// rebalance loop working end-to-end ... manual trigger, no AI layer yet").
// The automated poll loop (milestone 2) belongs in index.ts once this has
// been proven against real testnet vaults.
import "dotenv/config";
import { logger } from "./lib/logger.js";
import { mastra } from "./mastra/index.js";

async function main() {
  const workflow = mastra.getWorkflow("rebalanceWorkflow");
  const run = await workflow.createRun();
  const result = await run.start({ inputData: {} });

  if (result.status === "success") {
    logger.info("Rebalance run complete", result.result);
  } else {
    logger.error("Rebalance run did not complete", { status: result.status, error: "error" in result ? result.error.message : undefined });
    process.exitCode = 1;
  }
}

main().catch((err) => {
  logger.error("Rebalance run failed", { error: err instanceof Error ? err.message : String(err) });
  process.exitCode = 1;
});
