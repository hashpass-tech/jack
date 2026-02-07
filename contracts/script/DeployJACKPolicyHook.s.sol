// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {JACKPolicyHook} from "../src/JACKPolicyHook.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";

contract DeployJACKPolicyHook is Script {
    error InvalidPoolManager();

    function run() external returns (JACKPolicyHook hook) {
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");
        if (poolManager == address(0)) revert InvalidPoolManager();

        vm.startBroadcast();
        address deployer = msg.sender;

        hook = new JACKPolicyHook(IPoolManager(poolManager));

        address ownerFromEnv = vm.envOr("HOOK_OWNER", address(0));
        address finalOwner = ownerFromEnv == address(0) ? deployer : ownerFromEnv;
        if (finalOwner != deployer) {
            hook.transferOwnership(finalOwner);
        }

        vm.stopBroadcast();

        console2.log("DEPLOYER=%s", deployer);
        console2.log("POOL_MANAGER=%s", poolManager);
        console2.log("JACK_POLICY_HOOK=%s", address(hook));
        console2.log("HOOK_OWNER=%s", hook.owner());
    }
}
