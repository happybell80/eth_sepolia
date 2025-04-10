// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script, console } from "forge-std/Script.sol";
import { MyToken } from "../src/Token.sol";

contract Deploy is Script {
    function run() external returns (MyToken) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY"); // .env 에서 읽기
        address initialOwner = vm.addr(deployerPrivateKey); // 개인키로부터 주소 얻기

        vm.startBroadcast(deployerPrivateKey); // 개인키로 브로드캐스트 시작

        console.log("Deploying MyToken with initial owner:", initialOwner);
        MyToken token = new MyToken(initialOwner); // 생성자에 배포자 주소 전달

        vm.stopBroadcast();
        console.log("MyToken deployed to:", address(token));
        return token;
    }
}