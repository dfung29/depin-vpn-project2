// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockCLR is ERC20 {
    constructor() ERC20("ClearNet Token", "CLR") {
        _mint(msg.sender, 1_000_000_000 ether);
    }
}
