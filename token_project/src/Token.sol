pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor(address initialOwner) ERC20("MyToken", "MTK") Ownable(initialOwner) {
        _mint(initialOwner, 1000000 * 10 ** decimals()); // 1,000,000 토큰 발행
    }

    // 필요시 추가 함수 구현 (예: 추가 발행 등)
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}