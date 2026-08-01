# HedgeFlow — Product Requirements Document

**Status:** Draft v1
**Owner:** [fill in]
**Last updated:** August 2026

---

## 1. Summary

HedgeFlow is an AI-assisted, cross-chain liquidity protection protocol for USDC. It automatically rebalances USDC reserves across supported blockchains using Circle's CCTP V2, gives users a single unified balance via Circle Gateway, and removes gas friction with Circle Paymaster. The goal is that a user's USDC is always usable, on any supported chain, instantly, without the user ever thinking about bridging or gas.

## 2. Problem statement

USDC liquidity is fragmented across chains. Activity is uneven — one chain can drain its reserves while another sits underused — which causes failed transactions, stuck withdrawals, and poor UX for users on the drained chain. Existing workarounds (manual bridging, wrapped-asset bridges, holding multiple native gas tokens) add risk, friction, and onboarding drop-off. HedgeFlow removes this fragmentation from the user's perspective while solving it for real behind the scenes.

## 3. Goals

- Maintain sufficient USDC reserves on every supported chain to satisfy user demand without manual intervention.
- Give users a single deposit that behaves as one balance, usable instantly on any supported chain.
- Remove gas-token friction entirely — users never need to hold a chain's native token to transact.
- Keep all fund-moving logic deterministic and auditable; keep AI in an advisory role only.
- Ship an MVP that proves the rebalancing loop end-to-end on testnet before handling real value.

### Non-goals (v1)

- Supporting assets other than USDC.
- Custom/user-defined rebalancing strategies (v1 uses protocol-defined thresholds).
- Fully autonomous AI-triggered fund movement (all moves run through the deterministic workflow; AI does not initiate transfers in v1).
- Non-EVM chain support beyond what CCTP V2 / Gateway natively support at launch.

## 4. Users

- **End users** — deposit USDC once, transact across chains without thinking about bridging or gas.
- **Protocol operators (internal)** — monitor reserve health, review AI-flagged anomalies, approve/adjust rebalancing thresholds.
- **Integrating dApps** (future) — apps that plug into HedgeFlow's unified balance so their own users get cross-chain liquidity for free.

## 5. System architecture

Two layers, as established in earlier design work:

**User-facing layer**
- **Gateway** — unified USDC balance; deposit once, access on any supported chain in under ~500ms.
- **Paymaster** — gas abstraction; fees sponsored or paid in USDC, no native token required.

**Protocol-facing layer**
- **Rebalancing engine** — monitors per-chain vault balances and triggers movement when needed.
  - **Workflow (deterministic)** — the actual execution graph: check balances → compute deltas against target ratios → submit CCTP V2 burn → poll attestation → mint on destination. No LLM in this path.
  - **Agent (AI, advisory)** — anomaly detection, plain-language explanations of rebalance decisions, and threshold-tuning suggestions. Never initiates a transfer directly.
- **CCTP V2** — burns USDC on the surplus chain, mints USDC on the deficit chain. Real USDC, not wrapped assets.
- **Chain vaults** — per-chain smart contracts holding protocol USDC reserves.

**Rule of thumb used throughout:** if it's the user's own action (deposit, spend, withdraw), it goes through Gateway + Paymaster. If it's the protocol moving its own reserves, it goes through CCTP V2 via the rebalancing engine.

## 6. Functional requirements

### 6.1 Vault contracts
- FR-1: Deploy a vault contract on each supported chain to hold protocol USDC reserves.
- FR-2: Vault must expose balance-read functions callable by the rebalancing engine.
- FR-3: Vault fund movements (in/out) must be restricted to an authorized controller (multisig or equivalent — see Section 8, Open Questions).
- FR-4: All vault transactions must emit events sufficient for off-chain reconstruction of full transfer history.

### 6.2 Rebalancing engine
- FR-5: Continuously (polling interval TBD) read USDC balances across all supported chain vaults.
- FR-6: Compute each chain's balance against a target ratio / minimum threshold.
- FR-7: When a chain falls below threshold, compute the required transfer amount and source chain(s).
- FR-8: Execute the transfer via CCTP V2 (burn on source, mint on destination) through the deterministic workflow.
- FR-9: Log every rebalance decision (trigger reason, amount, source, destination, timestamp) for audit and for the AI agent's explanation layer.
- FR-10: Support a manual override / pause switch for operators.

### 6.3 AI agent layer
- FR-11: Detect anomalous patterns in balance/withdrawal data (e.g., sudden drain) and raise an alert.
- FR-12: Generate a plain-language explanation for each completed rebalance, derived from FR-9's log data.
- FR-13: Suggest threshold adjustments based on historical patterns; suggestions require human approval before taking effect.
- FR-14: Agent must not hold any key or permission capable of moving funds.

### 6.4 User-facing layer (Gateway + Paymaster)
- FR-15: Users can deposit USDC once and access a unified balance across all supported chains.
- FR-16: All user-initiated transactions are gasless from the user's perspective (fees sponsored or paid in USDC via Paymaster).
- FR-17: Unified balance reflects near-real-time state (target: sub-second, per Gateway's <500ms settlement).
- FR-18: Provide a fallback path for users if the Gateway attestation service is unavailable (trustless withdrawal path per Circle's documented 7-day window).

### 6.5 Observability
- FR-19: Full tracing of every agent decision and workflow execution step (Mastra observability / tracing).
- FR-20: Dashboard (internal, v1 can be minimal) showing current reserve levels per chain, recent rebalances, and any open AI-flagged anomalies.

## 7. Non-functional requirements

- **Security:** vault access control, key management, and audit trail are first-class concerns given this contract holds pooled user funds. A third-party smart contract audit is required before mainnet deployment with real value.
- **Determinism & auditability:** the fund-movement path must be fully reproducible and testable independent of any LLM call.
- **Latency:** user-facing balance access should feel instant (aligned to Gateway's sub-second settlement); rebalancing itself can tolerate CCTP V2's ~8–20 second Fast Transfer window.
- **Reliability:** rebalancing engine must handle a chain RPC or CCTP attestation failure gracefully (retry logic, alerting, no silent failures).
- **Compliance:** stay current with Circle's terms for CCTP V2 and Gateway, both of which are still evolving (Gateway is in early access, CCTP V1 is being deprecated — confirm current terms before each milestone).

## 8. Open questions

- **Vault custody model:** simple owned contract, multisig (e.g., Safe), or on-chain governance? This has direct implications for trust claims made to users.
- **Rebalance trigger logic:** simple threshold-based, or incorporate predictive signals (utilization trend, pending withdrawal queue)? v1 should start simple and iterate.
- **Chain set for MVP:** which chains launch first? Recommend starting with 2–3 CCTP V2-supported chains (e.g., Ethereum, Arbitrum, Base) to prove the loop before expanding.
- **Threshold-tuning approval flow:** who reviews and approves AI-suggested threshold changes, and how often?
- **Fee model:** who absorbs Gateway's onchain fee and Paymaster's markup — the protocol or the user?

## 9. Tech stack (proposed)

- **Smart contracts:** Solidity, deployed per-chain vaults; standard EVM tooling (Foundry/Hardhat).
- **Rebalancing engine:** TypeScript, built on Mastra — deterministic Workflow for execution, Agent for the advisory/reasoning layer, Tools wrapping chain RPC + CCTP V2 + Gateway calls, Memory for historical decision context, built-in Evals/observability for pre-mainnet backtesting and production tracing.
- **Chain interaction:** viem or ethers.js.
- **Frontend:** wallet connect + Gateway/Paymaster SDK integration for the deposit/unified-balance experience.

## 10. Milestones

1. **Testnet proof of concept** — single rebalance loop working end-to-end (2 chains, manual trigger, no AI layer yet).
2. **Automated rebalancing** — deterministic workflow running on a schedule/threshold trigger across 3 chains.
3. **AI agent layer** — anomaly detection + decision explanations added, evaluated against historical/backtested data.
4. **User-facing layer** — Gateway + Paymaster integrated for deposits and gasless transactions.
5. **Audit + mainnet** — third-party smart contract audit, then mainnet launch with real (initially capped) reserves.

## 11. Success metrics

- Zero user-facing "insufficient liquidity" failures across supported chains during testing.
- Rebalance execution success rate (target: >99% of triggered rebalances complete without manual intervention).
- Time-to-detect for AI-flagged anomalies vs. actual liquidity events.
- User onboarding completion rate (deposit → first cross-chain action) as a proxy for how well the gasless, unified-balance UX is working.

## 12. Glossary

- **CCTP V2** — Circle's Cross-Chain Transfer Protocol; burns USDC on a source chain and mints it on a destination chain.
- **Gateway** — Circle's unified-balance product; lets a user access deposited USDC instantly on any supported chain.
- **Paymaster** — Circle's gas-abstraction product; lets users pay fees in USDC or have them sponsored, without holding a native gas token.
- **Vault** — a per-chain smart contract holding HedgeFlow's USDC reserves.
- **Rebalancing engine** — HedgeFlow's own system that decides when and how much USDC to move between vaults.
