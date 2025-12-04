// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title CLRToken - ClearNet Test Token
/// @notice Simple ERC20 token for ClearNet P2P VPN testing
contract CLRToken is ERC20, Ownable {
    
    /// @notice Initialize CLRToken with initial supply
    constructor() ERC20("ClearNet Token", "CLR") Ownable(msg.sender) {
        // Mint 10 million tokens to deployer for testing
        _mint(msg.sender, 10_000_000 * 10**18);
    }
    
    /// @notice Mint additional tokens for testing purposes
    /// @param _to Recipient address
    /// @param _amount Amount to mint
    function mint(address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "Cannot mint to zero address");
        _mint(_to, _amount);
    }
    
    /// @notice Burn tokens
    /// @param _amount Amount to burn
    function burn(uint256 _amount) external {
        _burn(msg.sender, _amount);
    }
}

