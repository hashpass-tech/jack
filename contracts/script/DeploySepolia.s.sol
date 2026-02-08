// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {JACKPolicyHook} from "../src/JACKPolicyHook.sol";
import {JACKSettlementAdapter} from "../src/JACKSettlementAdapter.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {HookMiner} from "v4-periphery/src/utils/HookMiner.sol";

/**
 * @title DeploySepolia
 * @notice Deployment script for JACKPolicyHook and JACKSettlementAdapter to Sepolia testnet
 * @dev Deploys both contracts in sequence using CREATE2 for hook address mining
 */
contract DeploySepolia is Script {
    error InvalidPoolManager();
    error InvalidPolicyHookAddress();

    // CREATE2 Deployer Proxy address (same across all chains)
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external returns (JACKPolicyHook hook, JACKSettlementAdapter adapter) {
        // Load configuration from environment
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");
        if (poolManager == address(0)) revert InvalidPoolManager();

        // Calculate hook flags (only beforeSwap is enabled)
        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG);

        // Mine for a salt that produces a valid hook address
        console2.log("Mining for hook address with beforeSwap flag...");
        bytes memory creationCode = type(JACKPolicyHook).creationCode;
        bytes memory constructorArgs = abi.encode(poolManager);
        
        (address hookAddress, bytes32 salt) = HookMiner.find(
            CREATE2_DEPLOYER,
            flags,
            creationCode,
            constructorArgs
        );

        console2.log("Found valid hook address:", hookAddress);
        console2.log("Salt:", uint256(salt));

        vm.startBroadcast();
        address deployer = msg.sender;

        // Deploy JACKPolicyHook using CREATE2 with the mined salt
        console2.log("Deploying JACKPolicyHook with CREATE2...");
        hook = new JACKPolicyHook{salt: salt}(IPoolManager(poolManager));
        console2.log("JACKPolicyHook deployed at:", address(hook));

        // Verify the deployed address matches the mined address
        require(address(hook) == hookAddress, "Hook address mismatch");

        // Deploy JACKSettlementAdapter (no special address requirements)
        console2.log("Deploying JACKSettlementAdapter...");
        adapter = new JACKSettlementAdapter(address(hook));
        console2.log("JACKSettlementAdapter deployed at:", address(adapter));

        // Transfer ownership if specified in environment
        address ownerFromEnv = vm.envOr("HOOK_OWNER", address(0));
        address finalOwner = ownerFromEnv == address(0) ? deployer : ownerFromEnv;
        if (finalOwner != deployer) {
            console2.log("Transferring ownership to:", finalOwner);
            hook.transferOwnership(finalOwner);
            adapter.transferOwnership(finalOwner);
        }

        vm.stopBroadcast();

        // Log deployment summary
        console2.log("\n=== Deployment Summary ===");
        console2.log("Network: Sepolia (Chain ID: 11155111)");
        console2.log("Deployer:", deployer);
        console2.log("PoolManager:", poolManager);
        console2.log("JACKPolicyHook:", address(hook));
        console2.log("JACKSettlementAdapter:", address(adapter));
        console2.log("Hook Owner:", hook.owner());
        console2.log("Adapter Owner:", adapter.owner());
        console2.log("CREATE2 Salt:", uint256(salt));
        console2.log("=========================\n");
    }
}
