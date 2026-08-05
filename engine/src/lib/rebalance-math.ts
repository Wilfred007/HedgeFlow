// Deterministic trigger logic (FR-6, FR-7). v1 keeps PRD §8's open question
// ("simple threshold vs predictive signals") on the simple side: target share
// is an equal split across configured chains, and any chain whose share of
// total reserves drops below MIN_RESERVE_RATIO triggers a transfer from
// whichever chain has the largest surplus above its own target share, sized
// to bring the deficit chain back to (not just above) its target — so a
// single transfer doesn't immediately re-trigger next poll.
export interface ChainBalance {
  chainName: string;
  balanceRaw: bigint;
}

export interface RebalancePlan {
  sourceChain: string;
  destinationChain: string;
  amountRaw: bigint;
  reason: string;
}

export function computeRebalancePlan(balances: ChainBalance[], minReserveRatio: number): RebalancePlan | null {
  if (balances.length < 2) return null;

  const total = balances.reduce((sum, b) => sum + b.balanceRaw, 0n);
  if (total <= 0n) return null;

  const targetRaw = total / BigInt(balances.length);
  const shares = balances.map((b) => ({ ...b, share: Number(b.balanceRaw) / Number(total) }));

  const deficit = shares.filter((b) => b.share < minReserveRatio).sort((a, b) => a.share - b.share)[0];
  if (!deficit) return null;

  const surplus = shares
    .filter((b) => b.chainName !== deficit.chainName && b.balanceRaw > targetRaw)
    .sort((a, b) => Number(b.balanceRaw - targetRaw) - Number(a.balanceRaw - targetRaw))[0];
  if (!surplus) return null;

  const neededToReachTarget = targetRaw > deficit.balanceRaw ? targetRaw - deficit.balanceRaw : 0n;
  const surplusAvailable = surplus.balanceRaw - targetRaw;
  const amountRaw = neededToReachTarget < surplusAvailable ? neededToReachTarget : surplusAvailable;
  if (amountRaw <= 0n) return null;

  return {
    sourceChain: surplus.chainName,
    destinationChain: deficit.chainName,
    amountRaw,
    reason: `${deficit.chainName} share ${(deficit.share * 100).toFixed(1)}% below MIN_RESERVE_RATIO ${(minReserveRatio * 100).toFixed(1)}%`,
  };
}
