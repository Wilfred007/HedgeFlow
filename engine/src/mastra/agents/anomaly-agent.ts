// Advisory-only AI agent (PRD §6.3, FR-11..FR-14).
//
// Responsibilities:
//   - flag anomalous balance/withdrawal patterns
//   - explain completed rebalances in plain language, from the workflow's log (FR-9)
//   - suggest threshold adjustments for human approval
//
// Hard constraint: this agent must never be given a tool or key capable of
// moving funds (FR-14) — that path belongs only to rebalance.workflow.ts.
