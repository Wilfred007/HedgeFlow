// Shared types for the rebalancing engine. Placeholder — flesh out alongside
// the workflow/tools (PRD §6.2, §9).

export interface ChainConfig {
  name: string;
  chainId: number;
  cctpDomain: number;
  rpcUrl: string;
  vaultAddress: `0x${string}` | null;
  usdcAddress: `0x${string}` | null;
  /** CCTP V2 TokenMessengerV2 — burns USDC on this chain. Fill in from Circle's docs. */
  tokenMessengerAddress: `0x${string}` | null;
  /** CCTP V2 MessageTransmitterV2 — mints USDC on this chain via receiveMessage. Fill in from Circle's docs. */
  messageTransmitterAddress: `0x${string}` | null;
}

export interface RebalanceDecision {
  reason: string;
  sourceChain: string;
  destinationChain: string;
  amount: bigint;
  timestamp: number;
}
