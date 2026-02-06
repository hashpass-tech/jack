// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {JACKPolicyHook} from "../src/JACKPolicyHook.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";

contract JACKPolicyHookTest is Test {
    JACKPolicyHook internal hook;

    address internal owner = address(this);
    address internal updater = address(0xBEEF);
    bytes32 internal intentId = keccak256("intent-1");

    function setUp() public {
        hook = new JACKPolicyHook(IPoolManager(address(0x1234)));
    }

    function testOnlyOwnerCanSetPolicy() public {
        vm.prank(address(0xCAFE));
        vm.expectRevert(JACKPolicyHook.Unauthorized.selector);
        hook.setPolicyWithSlippage(intentId, 90, 100, 500, block.timestamp + 1 days, updater);
    }

    function testRejectsSwapWhenSlippageExceeded() public {
        hook.setPolicyWithSlippage(intentId, 90, 100, 500, block.timestamp + 1 days, updater);

        (bool allowed, bytes32 reason) = hook.checkPolicy(intentId, 94);
        assertFalse(allowed);
        assertEq(reason, hook.REASON_SLIPPAGE_EXCEEDED());
    }

    function testAllowsSwapWithinSlippageLimit() public {
        hook.setPolicyWithSlippage(intentId, 90, 100, 500, block.timestamp + 1 days, updater);

        (bool allowed, bytes32 reason) = hook.checkPolicy(intentId, 95);
        assertTrue(allowed);
        assertEq(reason, hook.REASON_OK());
    }

    function testRejectsExpiredPolicy() public {
        hook.setPolicyWithSlippage(intentId, 90, 100, 500, block.timestamp + 10, updater);
        vm.warp(block.timestamp + 11);

        (bool allowed, bytes32 reason) = hook.checkPolicy(intentId, 100);
        assertFalse(allowed);
        assertEq(reason, hook.REASON_POLICY_EXPIRED());
    }

    function testAssignedUpdaterCanModifyPolicyBounds() public {
        hook.setPolicyWithSlippage(intentId, 90, 100, 500, block.timestamp + 1 days, updater);

        vm.prank(updater);
        hook.updatePolicyBounds(intentId, 85, 100, 1200, block.timestamp + 2 days);

        (uint256 minAmountOut, uint256 referenceAmountOut, uint256 deadline, uint16 maxSlippageBps, address storedUpdater, bool exists) = hook.policies(intentId);
        assertEq(minAmountOut, 85);
        assertEq(referenceAmountOut, 100);
        assertEq(maxSlippageBps, 1200);
        assertEq(storedUpdater, updater);
        assertTrue(exists);
        assertGt(deadline, block.timestamp);
    }
}
