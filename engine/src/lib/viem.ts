import { createPublicClient, createWalletClient, http, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { ChainConfig } from "../types.js";
import { env } from "./env.js";

export function toViemChain(config: ChainConfig): Chain {
  return {
    id: config.chainId,
    name: config.name,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [config.rpcUrl] } },
  };
}

export function publicClientFor(config: ChainConfig) {
  if (!config.rpcUrl) throw new Error(`No RPC URL configured for chain "${config.name}"`);
  return createPublicClient({ chain: toViemChain(config), transport: http(config.rpcUrl) });
}

export function controllerWalletClientFor(config: ChainConfig) {
  if (!config.rpcUrl) throw new Error(`No RPC URL configured for chain "${config.name}"`);
  const account = privateKeyToAccount(env.controllerPrivateKey);
  return createWalletClient({ account, chain: toViemChain(config), transport: http(config.rpcUrl) });
}
