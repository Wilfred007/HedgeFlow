// Tool: read USDC vault balances per chain (PRD FR-2, FR-5). Thin wrapper —
// actual logic in lib/chain-rpc.ts, shared with rebalance.workflow.ts's
// checkBalances step so both the agent-callable tool and the deterministic
// workflow call the same code path.
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { readVaultBalance } from "../../lib/chain-rpc.js";

export const getVaultBalanceTool = createTool({
  id: "get-vault-balance",
  description: "Read a chain vault's current USDC balance (raw units, 6 decimals).",
  inputSchema: z.object({ chainName: z.string() }),
  outputSchema: z.object({
    chainName: z.string(),
    balanceRaw: z.string(),
    asOf: z.number(),
  }),
  execute: async (inputData) => {
    const result = await readVaultBalance(inputData.chainName);
    return { chainName: result.chainName, balanceRaw: result.balanceRaw.toString(), asOf: result.asOf };
  },
});
