// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../src/Token.sol";
import "forge-std/Script.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        MyToken token = new MyToken();
        vm.stopBroadcast();
    }
}