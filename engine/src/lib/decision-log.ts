// Append-only decision log (FR-9). Feeds audit trail today; feeds the
// advisory agent's explanation/backtesting layer once that exists (FR-12, FR-13).
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// Deliberately not RebalanceDecision as-is: that type's `amount` is a bigint,
// which JSON.stringify can't serialize. Log records use string amounts.
export interface RebalanceDecisionRecord {
  reason: string;
  sourceChain: string;
  destinationChain: string;
  amountRaw: string;
  timestamp: number;
  burnTxHash?: string;
  mintTxHash?: string;
}

const engineRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOG_PATH = process.env.DECISION_LOG_PATH ?? join(engineRoot, "decisions.log");

export function logDecision(record: RebalanceDecisionRecord): void {
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  appendFileSync(LOG_PATH, `${JSON.stringify(record)}\n`, "utf8");
}

export function readAllDecisions(): RebalanceDecisionRecord[] {
  if (!existsSync(LOG_PATH)) return [];
  return readFileSync(LOG_PATH, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RebalanceDecisionRecord);
}
