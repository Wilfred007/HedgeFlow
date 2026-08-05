import { getChain } from "../config/chains.js";
import { vaultAbi } from "./abi.js";
import { publicClientFor } from "./viem.js";

export interface VaultBalance {
  chainName: string;
  balanceRaw: bigint;
  asOf: number;
}

export async function readVaultBalance(chainName: string): Promise<VaultBalance> {
  const chain = getChain(chainName);
  if (!chain.vaultAddress) {
    throw new Error(`No vaultAddress configured for chain "${chain.name}" — deploy first (contracts/script/Deploy.s.sol)`);
  }
  const client = publicClientFor(chain);
  const balanceRaw = await client.readContract({
    address: chain.vaultAddress,
    abi: vaultAbi,
    functionName: "balance",
  });
  return { chainName: chain.name, balanceRaw, asOf: Date.now() };
}
