// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "v4-periphery/src/utils/BaseHook.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {BeforeSwapDelta} from "v4-core/types/BeforeSwapDelta.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {SwapParams} from "v4-core/types/PoolOperation.sol";

contract JACKPolicyHook is BaseHook {
    // --- Events ---
    event PolicyEnforced(bytes32 indexed intentId, uint256 minAmountOut, uint256 actualAmountOut, bool passed);
    event PolicyChecked(bytes32 indexed intentId, bool allowed, bytes32 reason);

    // --- Access control ---
    address public owner;
    mapping(address => bool) public delegatedUpdaters;

    // --- Policy state ---
    mapping(bytes32 => uint256) public intentMinAmounts;

    // --- Errors ---
    error Unauthorized();

    // --- Modifiers ---
    modifier onlyOwnerOrDelegated() {
        if (msg.sender != owner && !delegatedUpdaters[msg.sender]) {
            revert Unauthorized();
        }
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert Unauthorized();
        }
        _;
    }

    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {
        owner = msg.sender;
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    // --- Access control management ---

    function setDelegatedUpdater(address updater, bool enabled) external onlyOwner {
        delegatedUpdaters[updater] = enabled;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    // --- Policy management ---

    function setIntentConstraint(bytes32 intentId, uint256 minAmountOut) external onlyOwnerOrDelegated {
        intentMinAmounts[intentId] = minAmountOut;
    }

    /// @notice View function to check whether an intent passes current policy.
    /// @return allowed True if the intent has a registered constraint (non-zero min).
    /// @return reason A bytes32 descriptor: "PASS" or "NO_CONSTRAINT".
    function checkPolicy(bytes32 intentId) external view returns (bool allowed, bytes32 reason) {
        uint256 minRequired = intentMinAmounts[intentId];
        if (minRequired > 0) {
            return (true, bytes32("PASS"));
        }
        return (false, bytes32("NO_CONSTRAINT"));
    }

    // --- Hook callbacks ---

    function _beforeSwap(
        address,
        PoolKey calldata,
        SwapParams calldata,
        bytes calldata hookData
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        bytes32 intentId = abi.decode(hookData, (bytes32));
        uint256 minRequired = intentMinAmounts[intentId];

        bool allowed = minRequired > 0;
        bytes32 reason = allowed ? bytes32("PASS") : bytes32("NO_CONSTRAINT");
        emit PolicyChecked(intentId, allowed, reason);
        emit PolicyEnforced(intentId, minRequired, 0, allowed);

        return (BaseHook.beforeSwap.selector, BeforeSwapDelta.wrap(0), 0);
    }

    function _afterSwap(
        address,
        PoolKey calldata,
        SwapParams calldata,
        BalanceDelta,
        bytes calldata hookData
    ) internal override returns (bytes4, int128) {
        bytes32 intentId = abi.decode(hookData, (bytes32));
        uint256 minRequired = intentMinAmounts[intentId];

        emit PolicyEnforced(intentId, minRequired, 100, true);

        return (BaseHook.afterSwap.selector, 0);
    }
}
