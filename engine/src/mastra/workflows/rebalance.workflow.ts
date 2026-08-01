// Deterministic rebalancing workflow (PRD §5, FR-5..FR-9). No LLM in this path.
//
// TODO steps, per the PRD's documented flow:
//   1. checkBalances     — read every chain vault via chain-rpc.tool
//   2. computeDeltas     — compare balances against target ratio/threshold
//   3. submitCctpBurn    — burn on the surplus chain via cctp.tool
//   4. pollAttestation   — wait for Circle's attestation
//   5. mintOnDestination — mint on the deficit chain via cctp.tool
//   6. logDecision       — persist reason/amount/source/dest/timestamp (FR-9),
//                          which feeds the anomaly-agent's explanation layer
