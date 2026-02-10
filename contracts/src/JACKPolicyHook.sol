// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "v4-periphery/src/utils/BaseHook.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {BeforeSwapDelta} from "v4-core/types/BeforeSwapDelta.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {SwapParams} from "v4-core/types/PoolOperation.sol";

contract JACKPolicyHook is BaseHook {
    bytes32 public constant REASON_OK = bytes32(0);
    bytes32 public constant REASON_POLICY_MISSING = keccak256("POLICY_MISSING");
    bytes32 public constant REASON_POLICY_EXPIRED = keccak256("POLICY_EXPIRED");
    bytes32 public constant REASON_SLIPPAGE_EXCEEDED = keccak256("SLIPPAGE_EXCEEDED");

    uint256 internal constant BPS_DENOMINATOR = 10_000;

    error Unauthorized();
    error InvalidSlippageBps(uint16 maxSlippageBps);
    error PolicyViolation(bytes32 intentId, bytes32 reason);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PolicyUpdated(
        bytes32 indexed intentId,
        uint256 minAmountOut,
        uint256 referenceAmountOut,
        uint16 maxSlippageBps,
        uint256 deadline,
        address indexed updater
    );
    event PolicyChecked(bytes32 indexed intentId, bool allowed, bytes32 reason);

    struct Policy {
        uint256 minAmountOut;
        uint256 referenceAmountOut;
        uint256 deadline;
        uint16 maxSlippageBps;
        address updater;
        bool exists;
    }

    address public owner;
    address public pendingOwner;
    mapping(bytes32 => Policy) public policies;

    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyPolicyUpdater(bytes32 intentId) {
        Policy memory policy = policies[intentId];
        if (msg.sender != owner && msg.sender != policy.updater) revert Unauthorized();
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert Unauthorized();
        pendingOwner = newOwner;
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert Unauthorized();
        emit OwnershipTransferred(owner, pendingOwner);
        owner = pendingOwner;
        delete pendingOwner;
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
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function setPolicy(bytes32 intentId, uint256 minAmountOut, uint256 deadline, address updater) external onlyOwner {
        _setPolicy(intentId, minAmountOut, minAmountOut, 0, deadline, updater);
    }

    function setPolicyWithSlippage(
        bytes32 intentId,
        uint256 minAmountOut,
        uint256 referenceAmountOut,
        uint16 maxSlippageBps,
        uint256 deadline,
        address updater
    ) external onlyOwner {
        _setPolicy(intentId, minAmountOut, referenceAmountOut, maxSlippageBps, deadline, updater);
    }

    function updatePolicyBounds(
        bytes32 intentId,
        uint256 minAmountOut,
        uint256 referenceAmountOut,
        uint16 maxSlippageBps,
        uint256 deadline
    ) external onlyPolicyUpdater(intentId) {
        Policy storage policy = policies[intentId];
        if (!policy.exists) revert PolicyViolation(intentId, REASON_POLICY_MISSING);
        _validateSlippageBps(maxSlippageBps);

        policy.minAmountOut = minAmountOut;
        policy.referenceAmountOut = referenceAmountOut;
        policy.maxSlippageBps = maxSlippageBps;
        policy.deadline = deadline;

        emit PolicyUpdated(intentId, minAmountOut, referenceAmountOut, maxSlippageBps, deadline, policy.updater);
    }

    function _beforeSwap(
        address,
        PoolKey calldata,
        SwapParams calldata,
        bytes calldata hookData
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        (bytes32 intentId, uint256 quotedAmountOut) = abi.decode(hookData, (bytes32, uint256));

        (bool allowed, bytes32 reason) = _checkPolicy(intentId, quotedAmountOut);
        emit PolicyChecked(intentId, allowed, reason);

        if (!allowed) revert PolicyViolation(intentId, reason);

        return (BaseHook.beforeSwap.selector, BeforeSwapDelta.wrap(0), 0);
    }

    function checkPolicy(bytes32 intentId, uint256 quotedAmountOut) external view returns (bool, bytes32) {
        return _checkPolicy(intentId, quotedAmountOut);
    }

    function _checkPolicy(bytes32 intentId, uint256 quotedAmountOut) internal view returns (bool, bytes32) {
        Policy memory policy = policies[intentId];
        if (!policy.exists) return (false, REASON_POLICY_MISSING);
        if (policy.deadline < block.timestamp) return (false, REASON_POLICY_EXPIRED);

        uint256 slippageBound = _slippageBound(policy.referenceAmountOut, policy.maxSlippageBps);
        uint256 effectiveMinOut = policy.minAmountOut > slippageBound ? policy.minAmountOut : slippageBound;

        if (quotedAmountOut < effectiveMinOut) return (false, REASON_SLIPPAGE_EXCEEDED);

        return (true, REASON_OK);
    }

    function _setPolicy(
        bytes32 intentId,
        uint256 minAmountOut,
        uint256 referenceAmountOut,
        uint16 maxSlippageBps,
        uint256 deadline,
        address updater
    ) internal {
        _validateSlippageBps(maxSlippageBps);

        policies[intentId] = Policy({
            minAmountOut: minAmountOut,
            referenceAmountOut: referenceAmountOut,
            deadline: deadline,
            maxSlippageBps: maxSlippageBps,
            updater: updater,
            exists: true
        });

        emit PolicyUpdated(intentId, minAmountOut, referenceAmountOut, maxSlippageBps, deadline, updater);
    }

    function _slippageBound(uint256 referenceAmountOut, uint16 maxSlippageBps) internal pure returns (uint256) {
        return (referenceAmountOut * (BPS_DENOMINATOR - maxSlippageBps)) / BPS_DENOMINATOR;
    }

    function _validateSlippageBps(uint16 maxSlippageBps) internal pure {
        if (maxSlippageBps > BPS_DENOMINATOR) revert InvalidSlippageBps(maxSlippageBps);
    }
}
