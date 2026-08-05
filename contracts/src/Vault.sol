// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

/// @title Vault
/// @notice Per-chain USDC reserve contract for HedgeFlow's rebalancing engine (PRD §6.1, FR-1..FR-4, FR-10).
/// @dev Custody model: single controller EOA/key, matching the CONTROLLER_PRIVATE_KEY already wired
///      through the engine scaffold. Multisig/governance custody is a mainnet decision (PRD §8) and
///      intentionally out of scope for this testnet MVP — controller is a plain settable address so
///      swapping in a Safe later is a config change, not a rewrite.
contract Vault {
    IERC20 public immutable asset;
    address public controller;
    bool public paused;

    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event ControllerUpdated(address indexed previousController, address indexed newController);
    event PausedSet(bool paused);

    error NotController();
    error IsPaused();
    error ZeroAddress();
    error ZeroAmount();
    error TransferFailed();

    modifier onlyController() {
        if (msg.sender != controller) revert NotController();
        _;
    }

    constructor(address asset_, address controller_) {
        if (asset_ == address(0) || controller_ == address(0)) revert ZeroAddress();
        asset = IERC20(asset_);
        controller = controller_;
    }

    /// @notice Pull `amount` of the vault's asset from the controller into the vault (FR-3).
    /// @dev Controller must have approved this vault for `amount` beforehand.
    function deposit(uint256 amount) external onlyController {
        if (amount == 0) revert ZeroAmount();
        bool ok = asset.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();
        emit Deposited(msg.sender, amount);
    }

    /// @notice Send `amount` of the vault's asset out to `to` (FR-3). Blocked while paused (FR-10).
    function withdraw(address to, uint256 amount) external onlyController {
        if (paused) revert IsPaused();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        bool ok = asset.transfer(to, amount);
        if (!ok) revert TransferFailed();
        emit Withdrawn(to, amount);
    }

    /// @notice Current USDC reserve held by this vault, pollable by the rebalancing engine (FR-2).
    function balance() external view returns (uint256) {
        return asset.balanceOf(address(this));
    }

    /// @notice Operator pause switch (FR-10) — halts withdrawals, not deposits.
    function setPaused(bool paused_) external onlyController {
        paused = paused_;
        emit PausedSet(paused_);
    }

    /// @notice Rotate the controller address, e.g. moving from an EOA to a Safe at mainnet time.
    function setController(address newController) external onlyController {
        if (newController == address(0)) revert ZeroAddress();
        emit ControllerUpdated(controller, newController);
        controller = newController;
    }
}
