import { describe, expect, it } from "vitest";
import { computeRebalancePlan } from "./rebalance-math.js";

describe("computeRebalancePlan", () => {
  it("returns null when all chains are within threshold", () => {
    const balances = [
      { chainName: "a", balanceRaw: 100n },
      { chainName: "b", balanceRaw: 100n },
      { chainName: "c", balanceRaw: 100n },
    ];
    expect(computeRebalancePlan(balances, 0.2)).toBeNull();
  });

  it("moves funds from the largest surplus chain to the deficit chain", () => {
    const balances = [
      { chainName: "a", balanceRaw: 10n }, // 10/300 = 3.3%, below 20% threshold
      { chainName: "b", balanceRaw: 145n },
      { chainName: "c", balanceRaw: 145n },
    ];
    const plan = computeRebalancePlan(balances, 0.2);
    expect(plan).not.toBeNull();
    expect(plan?.destinationChain).toBe("a");
    expect(plan?.sourceChain).toBe("b");
    // target share = 300/3 = 100; deficit chain needs 90, but source chain
    // only has 45 of surplus above its own target — transfer is capped there
    expect(plan?.amountRaw).toBe(45n);
  });

  it("caps the transfer at the source chain's actual surplus above target", () => {
    const balances = [
      { chainName: "a", balanceRaw: 1n }, // deep deficit, wants a lot
      { chainName: "b", balanceRaw: 10n }, // barely above target, little to spare
      { chainName: "c", balanceRaw: 289n },
    ];
    const plan = computeRebalancePlan(balances, 0.2);
    // target = 300/3 = 100; b's surplus above target is negative (10 < 100),
    // so the only real surplus chain is c
    expect(plan?.sourceChain).toBe("c");
  });

  it("returns null with fewer than two chains", () => {
    expect(computeRebalancePlan([{ chainName: "a", balanceRaw: 100n }], 0.2)).toBeNull();
  });

  it("returns null when total reserves are zero", () => {
    const balances = [
      { chainName: "a", balanceRaw: 0n },
      { chainName: "b", balanceRaw: 0n },
    ];
    expect(computeRebalancePlan(balances, 0.2)).toBeNull();
  });

  it("returns null when no chain has surplus above target to draw from", () => {
    // deficit chain exists but every other chain is already at/below target
    const balances = [
      { chainName: "a", balanceRaw: 1n },
      { chainName: "b", balanceRaw: 1n },
      { chainName: "c", balanceRaw: 1n },
      { chainName: "d", balanceRaw: 1n },
    ];
    expect(computeRebalancePlan(balances, 0.9)).toBeNull();
  });
});
