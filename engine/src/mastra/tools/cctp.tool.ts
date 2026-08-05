// Tools: CCTP V2 burn-and-mint transfer between vaults (PRD FR-8). Thin
// wrappers — actual logic in lib/cctp.ts, shared with rebalance.workflow.ts
// so the deterministic path and any future agent-callable tool use the same
// code. This is the only path that moves real funds — keep it out of reach
// of the advisory agent (FR-14).
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { mintOnDestination, pollAttestation, submitCctpBurn } from "../../lib/cctp.js";

export const submitCctpBurnTool = createTool({
  id: "submit-cctp-burn",
  description: "Withdraw USDC from the source vault and burn it via CCTP V2 TokenMessengerV2, targeting the destination vault as mint recipient.",
  inputSchema: z.object({
    sourceChainName: z.string(),
    destinationChainName: z.string(),
    amountRaw: z.string(),
  }),
  outputSchema: z.object({ burnTxHash: z.string() }),
  execute: async (inputData) => {
    const { burnTxHash } = await submitCctpBurn(inputData.sourceChainName, inputData.destinationChainName, BigInt(inputData.amountRaw));
    return { burnTxHash };
  },
});

export const pollAttestationTool = createTool({
  id: "poll-cctp-attestation",
  description: "Poll Circle's attestation service for a submitted burn until the message + attestation are ready.",
  inputSchema: z.object({
    sourceChainName: z.string(),
    burnTxHash: z.string(),
    maxAttempts: z.number().default(30),
    intervalMs: z.number().default(4000),
  }),
  outputSchema: z.object({ message: z.string(), attestation: z.string() }),
  execute: async (inputData) => {
    return pollAttestation(inputData.sourceChainName, inputData.burnTxHash, {
      maxAttempts: inputData.maxAttempts,
      intervalMs: inputData.intervalMs,
    });
  },
});

export const mintOnDestinationTool = createTool({
  id: "mint-on-destination",
  description: "Submit the attested CCTP message to the destination chain's MessageTransmitterV2 to mint USDC into the destination vault.",
  inputSchema: z.object({
    destinationChainName: z.string(),
    message: z.string(),
    attestation: z.string(),
  }),
  outputSchema: z.object({ mintTxHash: z.string() }),
  execute: async (inputData) => {
    const { mintTxHash } = await mintOnDestination(inputData.destinationChainName, inputData.message as `0x${string}`, inputData.attestation as `0x${string}`);
    return { mintTxHash };
  },
});
