// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Vault
/// @notice Placeholder for the per-chain USDC reserve contract (PRD §6.1, FR-1..FR-4).
/// @dev Scaffold only — no logic implemented yet. TODO:
///      - deposit()/withdraw() with controller-only access (FR-3)
///      - balance() read function pollable by the rebalancing engine (FR-2)
///      - events covering every fund movement for off-chain reconstruction (FR-4)
///      - pause switch for operators (FR-10)
///      - decide custody model (owned / Safe multisig / governance) — see PRD §8
contract Vault {}
