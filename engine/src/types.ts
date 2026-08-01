// Shared types for the rebalancing engine. Placeholder — flesh out alongside
// the workflow/tools (PRD §6.2, §9).

export interface ChainConfig {
  name: string;
  chainId: number;
  cctpDomain: number;
  rpcUrl: string;
  vaultAddress: `0x${string}` | null;
  usdcAddress: `0x${string}` | null;
}

export interface RebalanceDecision {
  reason: string;
  sourceChain: string;
  destinationChain: string;
  amount: bigint;
  timestamp: number;
}
