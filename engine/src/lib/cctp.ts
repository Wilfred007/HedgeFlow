// CCTP V2 burn-and-mint (PRD FR-8). Shared between mastra/tools/cctp.tool.ts
// (agent-callable, if ever needed) and rebalance.workflow.ts (the actual
// fund-moving path). This is the only code that moves real funds — keep it
// out of reach of the advisory agent (FR-14).
import { getAddress, pad } from "viem";
import { getChain } from "../config/chains.js";
import { erc20Abi, messageTransmitterV2Abi, tokenMessengerV2Abi, vaultAbi } from "./abi.js";
import { env } from "./env.js";
import { controllerWalletClientFor, publicClientFor } from "./viem.js";

// CCTP V2's fast-transfer finality tier (a threshold below 2000 requests fast
// transfer; 2000 requests standard/hard finality — see Circle's technical guide).
const DEFAULT_MIN_FINALITY_THRESHOLD = Number(process.env.CCTP_MIN_FINALITY_THRESHOLD ?? "1000");

// maxFee is NOT a flat amount — Circle charges it in basis points of the
// transfer amount (GET /v2/burn/USDC/fees), so a static raw-unit default is
// wrong by construction: too low for large transfers (silently falls back to
// slow standard-finality confirmation instead of failing loudly — learned
// this the hard way against real testnet infra), too high wastes fee budget
// on small ones. Fetch the live rate and compute it per-transfer instead.
// Formula per Circle's docs: fee = amount * round(bps * 100) / 1_000_000.
async function fetchFastTransferFeeRaw(sourceDomain: number, destinationDomain: number, amountRaw: bigint): Promise<bigint> {
  const res = await fetch(`${env.circleAttestationApiUrl}/v2/burn/USDC/fees/${sourceDomain}/${destinationDomain}`);
  if (!res.ok) throw new Error(`Failed to fetch CCTP fee rate: ${res.status} ${res.statusText}`);
  const tiers = (await res.json()) as Array<{ finalityThreshold: number; minimumFee: number }>;
  const fastTier = tiers.find((t) => t.finalityThreshold === DEFAULT_MIN_FINALITY_THRESHOLD);
  if (!fastTier) throw new Error(`No fee tier for finalityThreshold=${DEFAULT_MIN_FINALITY_THRESHOLD} in ${JSON.stringify(tiers)}`);
  const bpsScaled = BigInt(Math.round(fastTier.minimumFee * 100));
  const fee = (amountRaw * bpsScaled) / 1_000_000n;
  // Small safety margin — Circle's minimum can drift between the quote and
  // the burn landing on-chain; a maxFee at the exact minimum can flip back to
  // "insufficient_fee" on borderline timing.
  return (fee * 110n) / 100n;
}

export async function submitCctpBurn(sourceChainName: string, destinationChainName: string, amountRaw: bigint): Promise<{ burnTxHash: `0x${string}` }> {
  const source = getChain(sourceChainName);
  const destination = getChain(destinationChainName);
  if (!source.vaultAddress || !source.usdcAddress || !source.tokenMessengerAddress) {
    throw new Error(`Source chain "${source.name}" missing vaultAddress/usdcAddress/tokenMessengerAddress config`);
  }
  if (!destination.vaultAddress) {
    throw new Error(`Destination chain "${destination.name}" missing vaultAddress config`);
  }

  const maxFeeRaw = await fetchFastTransferFeeRaw(source.cctpDomain, destination.cctpDomain, amountRaw);

  const wallet = controllerWalletClientFor(source);
  const publicClient = publicClientFor(source);

  // Pull funds from the vault to the controller — the only address CCTP's
  // depositForBurn can burn from is the caller itself. If depositForBurn
  // below fails, funds sit recoverably in the controller EOA, not lost.
  const withdrawHash = await wallet.writeContract({
    address: source.vaultAddress,
    abi: vaultAbi,
    functionName: "withdraw",
    args: [wallet.account.address, amountRaw],
  });
  await publicClient.waitForTransactionReceipt({ hash: withdrawHash });

  const approveHash = await wallet.writeContract({
    address: source.usdcAddress,
    abi: erc20Abi,
    functionName: "approve",
    args: [source.tokenMessengerAddress, amountRaw],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  const mintRecipient = pad(getAddress(destination.vaultAddress), { size: 32 });
  const burnHash = await wallet.writeContract({
    address: source.tokenMessengerAddress,
    abi: tokenMessengerV2Abi,
    functionName: "depositForBurn",
    args: [
      amountRaw,
      destination.cctpDomain,
      mintRecipient,
      source.usdcAddress,
      `0x${"0".repeat(64)}`, // destinationCaller = bytes32(0): anyone may call receiveMessage
      maxFeeRaw,
      DEFAULT_MIN_FINALITY_THRESHOLD,
    ],
  });
  await publicClient.waitForTransactionReceipt({ hash: burnHash });

  return { burnTxHash: burnHash };
}

interface IrisMessage {
  status: string;
  message: `0x${string}` | null;
  attestation: `0x${string}` | null;
}

export async function pollAttestation(
  sourceChainName: string,
  burnTxHash: string,
  opts: { maxAttempts?: number; intervalMs?: number } = {},
): Promise<{ message: `0x${string}`; attestation: `0x${string}` }> {
  const source = getChain(sourceChainName);
  const maxAttempts = opts.maxAttempts ?? 30;
  const intervalMs = opts.intervalMs ?? 4000;
  const url = `${env.circleAttestationApiUrl}/v2/messages/${source.cctpDomain}?transactionHash=${burnTxHash}`;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const body = (await res.json()) as { messages?: IrisMessage[] };
      const msg = body.messages?.[0];
      if (msg?.status === "complete" && msg.message && msg.attestation) {
        return { message: msg.message, attestation: msg.attestation };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Attestation not ready after ${maxAttempts} attempts for burn ${burnTxHash}`);
}

export async function mintOnDestination(destinationChainName: string, message: `0x${string}`, attestation: `0x${string}`): Promise<{ mintTxHash: `0x${string}` }> {
  const destination = getChain(destinationChainName);
  if (!destination.messageTransmitterAddress) {
    throw new Error(`Destination chain "${destination.name}" missing messageTransmitterAddress config`);
  }
  const wallet = controllerWalletClientFor(destination);
  const publicClient = publicClientFor(destination);

  const mintHash = await wallet.writeContract({
    address: destination.messageTransmitterAddress,
    abi: messageTransmitterV2Abi,
    functionName: "receiveMessage",
    args: [message, attestation],
  });
  await publicClient.waitForTransactionReceipt({ hash: mintHash });

  return { mintTxHash: mintHash };
}
