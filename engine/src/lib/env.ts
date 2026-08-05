// Fail fast on missing required config instead of surfacing an obscure error
// mid-workflow (e.g. after a burn has already been submitted).

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  get controllerPrivateKey(): `0x${string}` {
    const key = required("CONTROLLER_PRIVATE_KEY");
    return (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`;
  },
  get minReserveRatio(): number {
    const raw = process.env.MIN_RESERVE_RATIO ?? "0.2";
    const ratio = Number(raw);
    if (!Number.isFinite(ratio) || ratio <= 0 || ratio >= 1) {
      throw new Error(`MIN_RESERVE_RATIO must be a number in (0, 1), got "${raw}"`);
    }
    return ratio;
  },
  get pollIntervalMs(): number {
    return Number(process.env.POLL_INTERVAL_MS ?? "30000");
  },
  get circleAttestationApiUrl(): string {
    // Circle's CCTP V2 sandbox attestation service. Verify against Circle's
    // current docs before relying on this for a real testnet run — API base
    // URLs and response shapes are called out as still-evolving in PRD §7.
    return process.env.CIRCLE_ATTESTATION_API_URL ?? "https://iris-api-sandbox.circle.com";
  },
};
