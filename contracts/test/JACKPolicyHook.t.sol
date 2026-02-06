// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {JACKPolicyHook} from "../src/JACKPolicyHook.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {SwapParams} from "v4-core/types/PoolOperation.sol";

contract JACKPolicyHookTest is Test {
    JACKPolicyHook internal hook;

    uint160 internal constant CLEAR_ALL_HOOK_FLAGS_MASK = ~uint160((1 << 14) - 1);

    address internal owner = address(this);
    address internal poolManager = address(0x1234);
    address internal updater = address(0xBEEF);
    bytes32 internal intentId = keccak256("intent-1");

    event PolicyChecked(bytes32 indexed intentId, bool allowed, bytes32 reason);

    function setUp() public {
        address hookAddress =
            address(uint160(type(uint160).max & CLEAR_ALL_HOOK_FLAGS_MASK | Hooks.BEFORE_SWAP_FLAG));
        deployCodeTo("JACKPolicyHook.sol:JACKPolicyHook", abi.encode(IPoolManager(poolManager)), hookAddress);
        hook = JACKPolicyHook(hookAddress);
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

    function testRejectsInvalidSlippageBpsOnSetPolicy() public {
        uint16 invalidBps = 10_001;
        vm.expectRevert(abi.encodeWithSelector(JACKPolicyHook.InvalidSlippageBps.selector, invalidBps));
        hook.setPolicyWithSlippage(intentId, 90, 100, invalidBps, block.timestamp + 1 days, updater);
    }

    function testRejectsInvalidSlippageBpsOnUpdatePolicy() public {
        hook.setPolicyWithSlippage(intentId, 90, 100, 500, block.timestamp + 1 days, updater);

        uint16 invalidBps = 10_001;
        vm.prank(updater);
        vm.expectRevert(abi.encodeWithSelector(JACKPolicyHook.InvalidSlippageBps.selector, invalidBps));
        hook.updatePolicyBounds(intentId, 90, 100, invalidBps, block.timestamp + 2 days);
    }

    function testBeforeSwapEmitsPolicyCheckedWhenAllowed() public {
        hook.setPolicyWithSlippage(intentId, 90, 100, 500, block.timestamp + 1 days, updater);

        PoolKey memory key;
        SwapParams memory params = SwapParams({zeroForOne: true, amountSpecified: -1, sqrtPriceLimitX96: 0});

        vm.expectEmit(true, false, false, true, address(hook));
        emit PolicyChecked(intentId, true, hook.REASON_OK());

        vm.prank(poolManager);
        hook.beforeSwap(address(this), key, params, abi.encode(intentId, uint256(95)));
    }

    function testBeforeSwapRevertsOnSlippageExceeded() public {
        hook.setPolicyWithSlippage(intentId, 90, 100, 500, block.timestamp + 1 days, updater);

        PoolKey memory key;
        SwapParams memory params = SwapParams({zeroForOne: true, amountSpecified: -1, sqrtPriceLimitX96: 0});

        vm.expectRevert(
            abi.encodeWithSelector(JACKPolicyHook.PolicyViolation.selector, intentId, hook.REASON_SLIPPAGE_EXCEEDED())
        );
        vm.prank(poolManager);
        hook.beforeSwap(address(this), key, params, abi.encode(intentId, uint256(94)));
    }
}
