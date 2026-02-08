// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "openzeppelin-contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "openzeppelin-contracts/utils/cryptography/SignatureChecker.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/utils/ReentrancyGuard.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "v4-core/types/BalanceDelta.sol";
import {Currency, CurrencyLibrary} from "v4-core/types/Currency.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {SwapParams} from "v4-core/types/PoolOperation.sol";
import {IERC20Minimal} from "v4-core/interfaces/external/IERC20Minimal.sol";
import {JACKPolicyHook} from "./JACKPolicyHook.sol";

interface IUnlockCallback {
    function unlockCallback(bytes calldata data) external returns (bytes memory);
}

/**
 * @title JACKSettlementAdapter
 * @notice Settles Solved Intents by interacting with the JACKPolicyHook and Uniswap v4.
 */
contract JACKSettlementAdapter is EIP712, ReentrancyGuard, IUnlockCallback {
    using BalanceDeltaLibrary for BalanceDelta;
    using CurrencyLibrary for Currency;

    error PolicyRejected(bytes32 intentId, bytes32 reason);
    error InvalidSignature();
    error UnauthorizedSolver(address solver);
    error UnauthorizedPoolManager(address caller);
    error IntentExpired(uint256 deadline, uint256 currentTimestamp);
    error QuotedAmountOutTooLow(uint256 quotedAmountOut, uint256 minAmountOut);
    error Unauthorized();

    event IntentSettled(bytes32 indexed intentId, address indexed solver);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event SolverAuthorizationUpdated(address indexed solver, bool authorized);

    struct Intent {
        bytes32 id;
        address user;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 deadline;
        bytes signature;
    }

    struct SettlementData {
        Intent intent;
        PoolKey poolKey;
        SwapParams swapParams;
        uint256 quotedAmountOut;
        address solver;
    }

    bytes32 private constant INTENT_TYPEHASH = keccak256(
        "Intent(bytes32 id,address user,address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,uint256 deadline)"
    );

    JACKPolicyHook public immutable policyHook;
    IPoolManager public immutable poolManager;
    address public owner;
    mapping(address => bool) public authorizedSolvers;

    constructor(address _policyHook) EIP712("JACKSettlementAdapter", "1") {
        policyHook = JACKPolicyHook(_policyHook);
        poolManager = policyHook.poolManager();
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlySolver() {
        if (msg.sender != owner && !authorizedSolvers[msg.sender]) {
            revert UnauthorizedSolver(msg.sender);
        }
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert Unauthorized();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setAuthorizedSolver(address solver, bool authorized) external onlyOwner {
        authorizedSolvers[solver] = authorized;
        emit SolverAuthorizationUpdated(solver, authorized);
    }

    function hashIntent(Intent calldata intent) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    INTENT_TYPEHASH,
                    intent.id,
                    intent.user,
                    intent.tokenIn,
                    intent.tokenOut,
                    intent.amountIn,
                    intent.minAmountOut,
                    intent.deadline
                )
            )
        );
    }

    /**
     * @notice Settles an intent by validating policy and executing the swap.
     */
    function settleIntent(
        Intent calldata intent,
        PoolKey calldata poolKey,
        SwapParams calldata swapParams,
        uint256 quotedAmountOut
    ) external nonReentrant onlySolver {
        if (intent.deadline < block.timestamp) {
            revert IntentExpired(intent.deadline, block.timestamp);
        }

        if (quotedAmountOut < intent.minAmountOut) {
            revert QuotedAmountOutTooLow(quotedAmountOut, intent.minAmountOut);
        }

        if (!SignatureChecker.isValidSignatureNow(intent.user, hashIntent(intent), intent.signature)) {
            revert InvalidSignature();
        }

        (bool allowed, bytes32 reason) = policyHook.checkPolicy(intent.id, quotedAmountOut);
        if (!allowed) revert PolicyRejected(intent.id, reason);

        SettlementData memory settlement = SettlementData({
            intent: intent,
            poolKey: poolKey,
            swapParams: swapParams,
            quotedAmountOut: quotedAmountOut,
            solver: msg.sender
        });

        poolManager.unlock(abi.encode(settlement));

        emit IntentSettled(intent.id, msg.sender);
    }

    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert UnauthorizedPoolManager(msg.sender);

        SettlementData memory settlement = abi.decode(data, (SettlementData));

        bytes memory hookData = abi.encode(settlement.intent.id, settlement.quotedAmountOut);
        BalanceDelta delta = poolManager.swap(settlement.poolKey, settlement.swapParams, hookData);

        _settleDeltas(settlement.intent.user, settlement.poolKey, delta);

        return bytes("");
    }

    function _settleDeltas(address payer, PoolKey memory poolKey, BalanceDelta delta) internal {
        int128 amount0 = delta.amount0();
        int128 amount1 = delta.amount1();

        if (amount0 > 0) {
            _settle(poolKey.currency0, payer, uint256(uint128(amount0)));
        } else if (amount0 < 0) {
            poolManager.take(poolKey.currency0, payer, uint256(uint128(-amount0)));
        }

        if (amount1 > 0) {
            _settle(poolKey.currency1, payer, uint256(uint128(amount1)));
        } else if (amount1 < 0) {
            poolManager.take(poolKey.currency1, payer, uint256(uint128(-amount1)));
        }
    }

    function _settle(Currency currency, address payer, uint256 amount) internal {
        if (amount == 0) return;

        poolManager.sync(currency);
        if (currency.isAddressZero()) {
            poolManager.settle{value: amount}();
        } else {
            // Transfer tokens from payer to poolManager
            IERC20Minimal(Currency.unwrap(currency)).transferFrom(payer, address(poolManager), amount);
            poolManager.settle();
        }
    }
}
