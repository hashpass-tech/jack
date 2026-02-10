// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {JACKSettlementAdapter} from "../src/JACKSettlementAdapter.sol";
import {JACKPolicyHook} from "../src/JACKPolicyHook.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {SwapParams} from "v4-core/types/PoolOperation.sol";

contract MockPoolManager {
    BalanceDelta public swapDelta;
    bytes public lastHookData;
    bool public reentrancyBlocked;
    bool public attemptReenter;
    address public adapter;
    bytes public reenterPayload;

    function setSwapDelta(BalanceDelta delta) external {
        swapDelta = delta;
    }

    function setReenter(address _adapter, bytes calldata payload) external {
        adapter = _adapter;
        reenterPayload = payload;
        attemptReenter = true;
    }

    function unlock(bytes calldata data) external returns (bytes memory) {
        if (attemptReenter) {
            attemptReenter = false;
            (JACKSettlementAdapter.Intent memory intent, PoolKey memory poolKey, SwapParams memory swapParams, uint256 quotedAmountOut) =
                abi.decode(reenterPayload, (JACKSettlementAdapter.Intent, PoolKey, SwapParams, uint256));
            try JACKSettlementAdapter(adapter).settleIntent(intent, poolKey, swapParams, quotedAmountOut) {
                reentrancyBlocked = false;
            } catch {
                reentrancyBlocked = true;
            }
        }

        return JACKSettlementAdapter(msg.sender).unlockCallback(data);
    }

    function swap(PoolKey calldata, SwapParams calldata, bytes calldata hookData) external returns (BalanceDelta) {
        lastHookData = hookData;
        return swapDelta;
    }

    function take(Currency, address, uint256, bool) external {}

    function settle(Currency, address, uint256, bool) external returns (uint256) {
        return 0;
    }
}

contract JACKSettlementAdapterTest is Test {
    uint160 internal constant CLEAR_ALL_HOOK_FLAGS_MASK = ~uint160((1 << 14) - 1);

    JACKSettlementAdapter internal adapter;
    JACKPolicyHook internal hook;
    MockPoolManager internal poolManager;

    address internal solver = address(0xBEEF);
    address internal user;
    uint256 internal userKey;

    bytes32 internal intentId = keccak256("intent-1");

    event IntentSettled(bytes32 indexed intentId, address indexed solver);

    function setUp() public {
        poolManager = new MockPoolManager();

        address hookAddress =
            address(uint160(type(uint160).max & CLEAR_ALL_HOOK_FLAGS_MASK | Hooks.BEFORE_SWAP_FLAG));
        deployCodeTo("JACKPolicyHook.sol:JACKPolicyHook", abi.encode(IPoolManager(address(poolManager))), hookAddress);
        hook = JACKPolicyHook(hookAddress);

        adapter = new JACKSettlementAdapter(address(hook));
        adapter.setAuthorizedSolver(solver, true);

        userKey = 0xA11CE;
        user = vm.addr(userKey);
    }

    function _buildIntent(uint256 deadline) internal view returns (JACKSettlementAdapter.Intent memory) {
        return JACKSettlementAdapter.Intent({
            id: intentId,
            user: user,
            tokenIn: address(0x1),
            tokenOut: address(0x2),
            amountIn: 100,
            minAmountOut: 90,
            deadline: deadline,
            signature: ""
        });
    }

    function _signIntent(JACKSettlementAdapter.Intent memory intent) internal view returns (bytes memory) {
        bytes32 digest = adapter.hashIntent(intent);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _defaultSwapParams() internal pure returns (PoolKey memory, SwapParams memory) {
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(0x1)),
            currency1: Currency.wrap(address(0x2)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });
        SwapParams memory params = SwapParams({zeroForOne: true, amountSpecified: -int256(100), sqrtPriceLimitX96: 0});
        return (key, params);
    }

    function testValidSettlementEmitsEventAndUsesHookData() public {
        uint256 deadline = block.timestamp + 1 days;
        JACKSettlementAdapter.Intent memory intent = _buildIntent(deadline);
        intent.signature = _signIntent(intent);

        hook.setPolicyWithSlippage(intent.id, intent.minAmountOut, intent.minAmountOut, 0, deadline, address(this));

        (PoolKey memory key, SwapParams memory params) = _defaultSwapParams();
        uint256 quotedAmountOut = intent.minAmountOut;

        vm.expectEmit(true, true, false, true, address(adapter));
        emit IntentSettled(intent.id, solver);

        vm.prank(solver);
        adapter.settleIntent(intent, key, params, quotedAmountOut);

        assertEq(poolManager.lastHookData(), abi.encode(intent.id, quotedAmountOut));
    }

    function testRejectsInvalidSignature() public {
        uint256 deadline = block.timestamp + 1 days;
        JACKSettlementAdapter.Intent memory intent = _buildIntent(deadline);
        intent.signature = "bad";

        hook.setPolicyWithSlippage(intent.id, intent.minAmountOut, intent.minAmountOut, 0, deadline, address(this));

        (PoolKey memory key, SwapParams memory params) = _defaultSwapParams();

        vm.prank(solver);
        vm.expectRevert(JACKSettlementAdapter.InvalidSignature.selector);
        adapter.settleIntent(intent, key, params, intent.minAmountOut);
    }

    function testRejectsUnauthorizedSolver() public {
        uint256 deadline = block.timestamp + 1 days;
        JACKSettlementAdapter.Intent memory intent = _buildIntent(deadline);
        intent.signature = _signIntent(intent);

        hook.setPolicyWithSlippage(intent.id, intent.minAmountOut, intent.minAmountOut, 0, deadline, address(this));

        (PoolKey memory key, SwapParams memory params) = _defaultSwapParams();

        vm.prank(address(0xCAFE));
        vm.expectRevert(abi.encodeWithSelector(JACKSettlementAdapter.UnauthorizedSolver.selector, address(0xCAFE)));
        adapter.settleIntent(intent, key, params, intent.minAmountOut);
    }

    function testPolicyRejectionBubblesUp() public {
        uint256 deadline = block.timestamp + 1 days;
        JACKSettlementAdapter.Intent memory intent = _buildIntent(deadline);
        intent.signature = _signIntent(intent);

        hook.setPolicyWithSlippage(intent.id, intent.minAmountOut + 10, intent.minAmountOut + 10, 0, deadline, address(this));

        (PoolKey memory key, SwapParams memory params) = _defaultSwapParams();

        vm.prank(solver);
        vm.expectRevert(
            abi.encodeWithSelector(JACKSettlementAdapter.PolicyRejected.selector, intent.id, hook.REASON_SLIPPAGE_EXCEEDED())
        );
        adapter.settleIntent(intent, key, params, intent.minAmountOut);
    }

    function testPolicyExpirationReverts() public {
        uint256 deadline = block.timestamp + 1;
        JACKSettlementAdapter.Intent memory intent = _buildIntent(deadline);
        intent.signature = _signIntent(intent);

        hook.setPolicyWithSlippage(intent.id, intent.minAmountOut, intent.minAmountOut, 0, deadline, address(this));
        vm.warp(deadline + 1);

        (PoolKey memory key, SwapParams memory params) = _defaultSwapParams();

        vm.prank(solver);
        vm.expectRevert(
            abi.encodeWithSelector(JACKSettlementAdapter.IntentExpired.selector, deadline, block.timestamp)
        );
        adapter.settleIntent(intent, key, params, intent.minAmountOut);
    }

    function testRejectsIntentReplay() public {
        uint256 deadline = block.timestamp + 1 days;
        JACKSettlementAdapter.Intent memory intent = _buildIntent(deadline);
        intent.signature = _signIntent(intent);

        hook.setPolicyWithSlippage(intent.id, intent.minAmountOut, intent.minAmountOut, 0, deadline, address(this));

        (PoolKey memory key, SwapParams memory params) = _defaultSwapParams();

        vm.prank(solver);
        adapter.settleIntent(intent, key, params, intent.minAmountOut);

        vm.prank(solver);
        vm.expectRevert(abi.encodeWithSelector(JACKSettlementAdapter.IntentAlreadySettled.selector, intent.id));
        adapter.settleIntent(intent, key, params, intent.minAmountOut);
    }

    function testRejectsPoolMismatch() public {
        uint256 deadline = block.timestamp + 1 days;
        JACKSettlementAdapter.Intent memory intent = _buildIntent(deadline);
        intent.signature = _signIntent(intent);

        hook.setPolicyWithSlippage(intent.id, intent.minAmountOut, intent.minAmountOut, 0, deadline, address(this));

        (PoolKey memory key, SwapParams memory params) = _defaultSwapParams();
        key.currency0 = Currency.wrap(address(0x99));
        key.currency1 = Currency.wrap(address(0xAA));

        vm.prank(solver);
        vm.expectRevert(JACKSettlementAdapter.PoolMismatch.selector);
        adapter.settleIntent(intent, key, params, intent.minAmountOut);
    }

    function testRejectsNativeEthIntent() public {
        uint256 deadline = block.timestamp + 1 days;
        JACKSettlementAdapter.Intent memory intent = _buildIntent(deadline);
        intent.tokenIn = address(0);
        intent.signature = _signIntent(intent);

        hook.setPolicyWithSlippage(intent.id, intent.minAmountOut, intent.minAmountOut, 0, deadline, address(this));

        (PoolKey memory key, SwapParams memory params) = _defaultSwapParams();

        vm.prank(solver);
        vm.expectRevert(JACKSettlementAdapter.NativeEthNotSupported.selector);
        adapter.settleIntent(intent, key, params, intent.minAmountOut);
    }

    function testReentrancyGuardBlocksNestedSettle() public {
        uint256 deadline = block.timestamp + 1 days;
        JACKSettlementAdapter.Intent memory intent = _buildIntent(deadline);
        intent.signature = _signIntent(intent);

        hook.setPolicyWithSlippage(intent.id, intent.minAmountOut, intent.minAmountOut, 0, deadline, address(this));

        (PoolKey memory key, SwapParams memory params) = _defaultSwapParams();
        uint256 quotedAmountOut = intent.minAmountOut;

        poolManager.setReenter(address(adapter), abi.encode(intent, key, params, quotedAmountOut));

        vm.prank(solver);
        adapter.settleIntent(intent, key, params, quotedAmountOut);

        assertTrue(poolManager.reentrancyBlocked());
    }
}
