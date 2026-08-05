// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Vault} from "../src/Vault.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract VaultTest is Test {
    Vault vault;
    MockERC20 usdc;

    address controller = makeAddr("controller");
    address other = makeAddr("other");
    address recipient = makeAddr("recipient");

    function setUp() public {
        usdc = new MockERC20();
        vault = new Vault(address(usdc), controller);
    }

    function test_constructor_rejectsZeroAddresses() public {
        vm.expectRevert(Vault.ZeroAddress.selector);
        new Vault(address(0), controller);

        vm.expectRevert(Vault.ZeroAddress.selector);
        new Vault(address(usdc), address(0));
    }

    // --- deposit ---

    function test_deposit_pullsFromControllerAndEmits() public {
        usdc.mint(controller, 100e6);
        vm.startPrank(controller);
        usdc.approve(address(vault), 100e6);

        vm.expectEmit(true, false, false, true);
        emit Vault.Deposited(controller, 100e6);
        vault.deposit(100e6);
        vm.stopPrank();

        assertEq(vault.balance(), 100e6);
        assertEq(usdc.balanceOf(controller), 0);
    }

    function test_deposit_revertsForNonController() public {
        vm.prank(other);
        vm.expectRevert(Vault.NotController.selector);
        vault.deposit(1);
    }

    function test_deposit_revertsForZeroAmount() public {
        vm.prank(controller);
        vm.expectRevert(Vault.ZeroAmount.selector);
        vault.deposit(0);
    }

    // --- withdraw ---

    function _fundVault(uint256 amount) internal {
        usdc.mint(controller, amount);
        vm.startPrank(controller);
        usdc.approve(address(vault), amount);
        vault.deposit(amount);
        vm.stopPrank();
    }

    function test_withdraw_sendsToRecipientAndEmits() public {
        _fundVault(50e6);

        vm.expectEmit(true, false, false, true);
        emit Vault.Withdrawn(recipient, 20e6);
        vm.prank(controller);
        vault.withdraw(recipient, 20e6);

        assertEq(usdc.balanceOf(recipient), 20e6);
        assertEq(vault.balance(), 30e6);
    }

    function test_withdraw_revertsForNonController() public {
        _fundVault(10e6);
        vm.prank(other);
        vm.expectRevert(Vault.NotController.selector);
        vault.withdraw(recipient, 1e6);
    }

    function test_withdraw_revertsWhenPaused() public {
        _fundVault(10e6);
        vm.startPrank(controller);
        vault.setPaused(true);
        vm.expectRevert(Vault.IsPaused.selector);
        vault.withdraw(recipient, 1e6);
        vm.stopPrank();
    }

    function test_withdraw_revertsForZeroAddress() public {
        _fundVault(10e6);
        vm.prank(controller);
        vm.expectRevert(Vault.ZeroAddress.selector);
        vault.withdraw(address(0), 1e6);
    }

    function test_withdraw_revertsForZeroAmount() public {
        _fundVault(10e6);
        vm.prank(controller);
        vm.expectRevert(Vault.ZeroAmount.selector);
        vault.withdraw(recipient, 0);
    }

    // --- pause ---

    function test_setPaused_onlyController() public {
        vm.prank(other);
        vm.expectRevert(Vault.NotController.selector);
        vault.setPaused(true);
    }

    function test_deposit_allowedWhilePaused() public {
        vm.prank(controller);
        vault.setPaused(true);
        _fundVault(5e6);
        assertEq(vault.balance(), 5e6);
    }

    // --- controller rotation ---

    function test_setController_rotatesAndEmits() public {
        vm.expectEmit(true, true, false, false);
        emit Vault.ControllerUpdated(controller, other);
        vm.prank(controller);
        vault.setController(other);

        assertEq(vault.controller(), other);
    }

    function test_setController_revertsForNonController() public {
        vm.prank(other);
        vm.expectRevert(Vault.NotController.selector);
        vault.setController(other);
    }

    function test_setController_revertsForZeroAddress() public {
        vm.prank(controller);
        vm.expectRevert(Vault.ZeroAddress.selector);
        vault.setController(address(0));
    }
}
