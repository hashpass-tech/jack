// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/JACKPolicyHook.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";

contract DeployHook is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        JACKPolicyHook hook = new JACKPolicyHook(IPoolManager(poolManager));
        
        console.log("JACKPolicyHook deployed at:", address(hook));
        
        vm.stopBroadcast();
    }
}
