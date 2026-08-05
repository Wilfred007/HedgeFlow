// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Vault} from "../src/Vault.sol";

/// @dev Deploys one Vault to whichever chain `--rpc-url` points at. Run once per
///      target chain (ethereum_sepolia / arbitrum_sepolia / base_sepolia), then
///      copy the logged address into engine/src/config/chains.ts.
///
///      Required env:
///        CONTROLLER_PRIVATE_KEY — broadcaster key; its address becomes the vault's controller
///        USDC_ADDRESS           — USDC token address on the target chain
contract Deploy is Script {
    function run() external {
        uint256 controllerKey = vm.envUint("CONTROLLER_PRIVATE_KEY");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address controller = vm.addr(controllerKey);

        vm.startBroadcast(controllerKey);
        Vault vault = new Vault(usdc, controller);
        vm.stopBroadcast();

        console.log("Vault deployed:", address(vault));
        console.log("  chainid:", block.chainid);
        console.log("  usdc:", usdc);
        console.log("  controller:", controller);
    }
}
