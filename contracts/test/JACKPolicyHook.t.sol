// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {JACKPolicyHook} from "../src/JACKPolicyHook.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {BaseHook} from "v4-periphery/src/utils/BaseHook.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";

/// @dev Testable subclass that skips hook-address validation.
contract TestableJACKPolicyHook is JACKPolicyHook {
    constructor(IPoolManager _pm) JACKPolicyHook(_pm) {}

    function validateHookAddress(BaseHook) internal pure override {
        // no-op: allows deployment at any address during tests
    }
}

contract JACKPolicyHookTest is Test {
    TestableJACKPolicyHook public hook;
    address public deployer;
    address public alice;
    address public bob;

    event PolicyChecked(bytes32 indexed intentId, bool allowed, bytes32 reason);
    event PolicyEnforced(bytes32 indexed intentId, uint256 minAmountOut, uint256 actualAmountOut, bool passed);

    function setUp() public {
        deployer = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        // Deploy with a dummy PoolManager address (never actually called in unit tests)
        hook = new TestableJACKPolicyHook(IPoolManager(address(0xBEEF)));
    }

    // ---------------------------------------------------------------
    // Ownership & access control
    // ---------------------------------------------------------------

    function test_OwnerIsDeployer() public view {
        assertEq(hook.owner(), deployer);
    }

    function test_TransferOwnership() public {
        hook.transferOwnership(alice);
        assertEq(hook.owner(), alice);
    }

    function test_TransferOwnership_RevertsForNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(JACKPolicyHook.Unauthorized.selector);
        hook.transferOwnership(alice);
    }

    function test_SetDelegatedUpdater() public {
        hook.setDelegatedUpdater(alice, true);
        assertTrue(hook.delegatedUpdaters(alice));
    }

    function test_SetDelegatedUpdater_RevertsForNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(JACKPolicyHook.Unauthorized.selector);
        hook.setDelegatedUpdater(bob, true);
    }

    function test_RevokeDelegatedUpdater() public {
        hook.setDelegatedUpdater(alice, true);
        assertTrue(hook.delegatedUpdaters(alice));

        hook.setDelegatedUpdater(alice, false);
        assertFalse(hook.delegatedUpdaters(alice));
    }

    // ---------------------------------------------------------------
    // setIntentConstraint – access control
    // ---------------------------------------------------------------

    function test_SetIntentConstraint_AsOwner() public {
        bytes32 intentId = keccak256("intent-1");
        hook.setIntentConstraint(intentId, 100);
        assertEq(hook.intentMinAmounts(intentId), 100);
    }

    function test_SetIntentConstraint_AsDelegatedUpdater() public {
        bytes32 intentId = keccak256("intent-2");
        hook.setDelegatedUpdater(alice, true);

        vm.prank(alice);
        hook.setIntentConstraint(intentId, 200);
        assertEq(hook.intentMinAmounts(intentId), 200);
    }

    function test_SetIntentConstraint_RevertsForUnauthorized() public {
        bytes32 intentId = keccak256("intent-3");
        vm.prank(bob);
        vm.expectRevert(JACKPolicyHook.Unauthorized.selector);
        hook.setIntentConstraint(intentId, 300);
    }

    // ---------------------------------------------------------------
    // checkPolicy – view function
    // ---------------------------------------------------------------

    function test_CheckPolicy_AllowPath() public {
        bytes32 intentId = keccak256("intent-allow");
        hook.setIntentConstraint(intentId, 500);

        (bool allowed, bytes32 reason) = hook.checkPolicy(intentId);
        assertTrue(allowed);
        assertEq(reason, bytes32("PASS"));
    }

    function test_CheckPolicy_RejectPath() public view {
        bytes32 intentId = keccak256("intent-unknown");
        (bool allowed, bytes32 reason) = hook.checkPolicy(intentId);
        assertFalse(allowed);
        assertEq(reason, bytes32("NO_CONSTRAINT"));
    }

    // ---------------------------------------------------------------
    // Hook permissions
    // ---------------------------------------------------------------

    function test_HookPermissions() public view {
        Hooks.Permissions memory p = hook.getHookPermissions();
        assertTrue(p.beforeSwap);
        assertTrue(p.afterSwap);
        assertFalse(p.beforeInitialize);
        assertFalse(p.afterInitialize);
        assertFalse(p.beforeAddLiquidity);
        assertFalse(p.afterAddLiquidity);
        assertFalse(p.beforeRemoveLiquidity);
        assertFalse(p.afterRemoveLiquidity);
        assertFalse(p.beforeDonate);
        assertFalse(p.afterDonate);
    }
}
