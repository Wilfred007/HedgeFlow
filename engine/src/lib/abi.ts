import { parseAbi } from "viem";

// Matches contracts/src/Vault.sol.
export const vaultAbi = parseAbi([
  "function balance() view returns (uint256)",
  "function withdraw(address to, uint256 amount) external",
]);

export const erc20Abi = parseAbi(["function approve(address spender, uint256 amount) external returns (bool)"]);

// CCTP V2 — signatures per Circle's documented interface. Verify against
// Circle's current docs before a real testnet run (PRD §7 flags CCTP V2 as
// still evolving); a mismatch here reverts on-chain rather than misdirecting
// funds, but the maxFee/minFinalityThreshold *values* used at the call site
// (lib/env.ts-adjacent config) are worth double-checking too.
export const tokenMessengerV2Abi = parseAbi([
  "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold) external",
]);

export const messageTransmitterV2Abi = parseAbi([
  "function receiveMessage(bytes message, bytes attestation) external returns (bool)",
]);
