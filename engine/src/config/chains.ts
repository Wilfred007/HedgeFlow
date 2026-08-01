import type { ChainConfig } from "../types.js";

// MVP chain set per PRD §8 open question ("Chain set for MVP"). Addresses are
// filled in after `forge script` deploys the vaults (contracts/script/Deploy.s.sol).
export const chains: ChainConfig[] = [
  {
    name: "ethereum-sepolia",
    chainId: 11155111,
    cctpDomain: 0,
    rpcUrl: process.env.ETH_SEPOLIA_RPC_URL ?? "",
    vaultAddress: null,
    usdcAddress: null,
  },
  {
    name: "arbitrum-sepolia",
    chainId: 421614,
    cctpDomain: 3,
    rpcUrl: process.env.ARB_SEPOLIA_RPC_URL ?? "",
    vaultAddress: null,
    usdcAddress: null,
  },
  {
    name: "base-sepolia",
    chainId: 84532,
    cctpDomain: 6,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL ?? "",
    vaultAddress: null,
    usdcAddress: null,
  },
];
