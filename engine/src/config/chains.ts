import type { ChainConfig } from "../types.js";

// Active MVP chain set (PRD §8). USDC/CCTP V2 addresses below are from
// developers.circle.com/cctp/references/contract-addresses (checked
// 2026-08-03, cross-referenced against a second Circle docs page) —
// re-verify there before a real run; Circle's terms/deployments are still
// evolving per PRD §7. vaultAddress is filled in after `forge script` deploys
// (contracts/script/Deploy.s.sol).
//
// Down to 2 chains (from the original 3-chain plan) because Celo — the
// proposed third chain — is not a CCTP V2-supported chain on mainnet or
// testnet (confirmed against Circle's docs 2026-08-05); its rebalancing
// engine can't burn/mint there at all. This actually matches PRD milestone 1
// ("2 chains, manual trigger") rather than milestone 2's 3-chain target — a
// third CCTP-compatible chain (Base Sepolia is pre-vetted below, just not
// deployed yet) is needed before automating past milestone 1.
export const chains: ChainConfig[] = [
  {
    name: "ethereum-sepolia",
    chainId: 11155111,
    cctpDomain: 0,
    rpcUrl: process.env.ETH_SEPOLIA_RPC_URL ?? "",
    vaultAddress: "0x87a37DE2bA75A851cA15568021E2748d43b7972D",
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    tokenMessengerAddress: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitterAddress: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  },
  {
    name: "arbitrum-sepolia",
    chainId: 421614,
    cctpDomain: 3,
    rpcUrl: process.env.ARB_SEPOLIA_RPC_URL ?? "",
    vaultAddress: "0x87a37DE2bA75A851cA15568021E2748d43b7972D",
    usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    tokenMessengerAddress: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitterAddress: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  },
];

// CCTP V2-verified but not yet deployed/activated — move into `chains` once
// funded + deployed (see contracts/script/Deploy.s.sol).
export const pendingChains: ChainConfig[] = [
  {
    name: "base-sepolia",
    chainId: 84532,
    cctpDomain: 6,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL ?? "",
    vaultAddress: null,
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    tokenMessengerAddress: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitterAddress: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  },
];

export function getChain(name: string): ChainConfig {
  const chain = [...chains, ...pendingChains].find((c) => c.name === name);
  if (!chain) throw new Error(`Unknown chain "${name}" — not in config/chains.ts`);
  return chain;
}
