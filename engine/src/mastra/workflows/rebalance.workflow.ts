// Deterministic rebalancing workflow (PRD §5, FR-5..FR-9). No LLM in this path.
//
//   1. checkBalances     — read every configured chain vault
//   2. computeDeltas     — compare balances against target/threshold (FR-6, FR-7)
//   3. submitCctpBurn    — burn on the surplus chain
//   4. pollAttestation   — wait for Circle's attestation
//   5. mintOnDestination — mint on the deficit chain
//   6. logDecision       — persist reason/amount/source/dest/timestamp (FR-9),
//                          feeds the advisory agent's explanation layer later
//
// Steps 3-6 no-op (pass a null decision through) when computeDeltas finds
// nothing to do — every chain is within threshold.
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { chains } from "../../config/chains.js";
import { readVaultBalance } from "../../lib/chain-rpc.js";
import { mintOnDestination, pollAttestation, submitCctpBurn } from "../../lib/cctp.js";
import { logDecision } from "../../lib/decision-log.js";
import { env } from "../../lib/env.js";
import { logger } from "../../lib/logger.js";
import { computeRebalancePlan } from "../../lib/rebalance-math.js";

const decisionSchema = z
  .object({
    sourceChain: z.string(),
    destinationChain: z.string(),
    amountRaw: z.string(),
    reason: z.string(),
  })
  .nullable();

const checkBalances = createStep({
  id: "check-balances",
  description: "Read every configured chain vault's USDC balance (FR-5).",
  inputSchema: z.object({}),
  outputSchema: z.object({
    balances: z.array(z.object({ chainName: z.string(), balanceRaw: z.string() })),
  }),
  execute: async () => {
    const balances = await Promise.all(chains.map((c) => readVaultBalance(c.name)));
    return { balances: balances.map((b) => ({ chainName: b.chainName, balanceRaw: b.balanceRaw.toString() })) };
  },
});

const computeDeltas = createStep({
  id: "compute-deltas",
  description: "Compare balances against target share / MIN_RESERVE_RATIO threshold (FR-6, FR-7).",
  inputSchema: checkBalances.outputSchema,
  outputSchema: z.object({ decision: decisionSchema }),
  execute: async ({ inputData }) => {
    const balances = inputData.balances.map((b) => ({ chainName: b.chainName, balanceRaw: BigInt(b.balanceRaw) }));
    const plan = computeRebalancePlan(balances, env.minReserveRatio);
    if (!plan) {
      logger.info("No rebalance needed — all chains within threshold");
      return { decision: null };
    }
    return {
      decision: {
        sourceChain: plan.sourceChain,
        destinationChain: plan.destinationChain,
        amountRaw: plan.amountRaw.toString(),
        reason: plan.reason,
      },
    };
  },
});

const submitBurn = createStep({
  id: "submit-cctp-burn",
  description: "Burn USDC on the surplus chain via CCTP V2 (FR-8).",
  inputSchema: computeDeltas.outputSchema,
  outputSchema: z.object({ decision: decisionSchema, burnTxHash: z.string().nullable() }),
  execute: async ({ inputData }) => {
    if (!inputData.decision) return { decision: null, burnTxHash: null };
    const { decision } = inputData;
    const { burnTxHash } = await submitCctpBurn(decision.sourceChain, decision.destinationChain, BigInt(decision.amountRaw));
    return { decision, burnTxHash };
  },
});

const pollAttestationStep = createStep({
  id: "poll-attestation",
  description: "Wait for Circle's CCTP V2 attestation service to attest the burn (FR-8).",
  inputSchema: submitBurn.outputSchema,
  outputSchema: z.object({
    decision: decisionSchema,
    burnTxHash: z.string().nullable(),
    message: z.string().nullable(),
    attestation: z.string().nullable(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData.decision || !inputData.burnTxHash) {
      return { decision: null, burnTxHash: null, message: null, attestation: null };
    }
    const { message, attestation } = await pollAttestation(inputData.decision.sourceChain, inputData.burnTxHash);
    return { decision: inputData.decision, burnTxHash: inputData.burnTxHash, message, attestation };
  },
});

const mintOnDestinationStep = createStep({
  id: "mint-on-destination",
  description: "Mint USDC into the deficit chain's vault (FR-8).",
  inputSchema: pollAttestationStep.outputSchema,
  outputSchema: z.object({ decision: decisionSchema, burnTxHash: z.string().nullable(), mintTxHash: z.string().nullable() }),
  execute: async ({ inputData }) => {
    if (!inputData.decision || !inputData.message || !inputData.attestation) {
      return { decision: null, burnTxHash: inputData.burnTxHash, mintTxHash: null };
    }
    const { mintTxHash } = await mintOnDestination(
      inputData.decision.destinationChain,
      inputData.message as `0x${string}`,
      inputData.attestation as `0x${string}`,
    );
    return { decision: inputData.decision, burnTxHash: inputData.burnTxHash, mintTxHash };
  },
});

const logDecisionStep = createStep({
  id: "log-decision",
  description: "Persist the rebalance decision for audit and the future advisory agent (FR-9).",
  inputSchema: mintOnDestinationStep.outputSchema,
  outputSchema: z.object({ logged: z.boolean(), decision: decisionSchema }),
  execute: async ({ inputData }) => {
    if (!inputData.decision) return { logged: false, decision: null };
    logDecision({
      ...inputData.decision,
      timestamp: Date.now(),
      burnTxHash: inputData.burnTxHash ?? undefined,
      mintTxHash: inputData.mintTxHash ?? undefined,
    });
    logger.info("Rebalance decision logged", inputData);
    return { logged: true, decision: inputData.decision };
  },
});

export const rebalanceWorkflow = createWorkflow({
  id: "rebalance",
  inputSchema: z.object({}),
  outputSchema: logDecisionStep.outputSchema,
})
  .then(checkBalances)
  .then(computeDeltas)
  .then(submitBurn)
  .then(pollAttestationStep)
  .then(mintOnDestinationStep)
  .then(logDecisionStep)
  .commit();
