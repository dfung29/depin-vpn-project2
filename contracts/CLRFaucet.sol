// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CLRFaucet - ClearNet Token Faucet for Testing
/// @notice Allows users to claim free CLR tokens for testing with a cooldown period
contract CLRFaucet is Ownable, ReentrancyGuard {
    
    // ========== STATE VARIABLES ==========
    
    IERC20 public clrToken;
    
    /// @notice Amount of tokens to dispense per claim
    uint256 public claimAmount = 100 * 10**18; // 100 CLR tokens
    
    /// @notice Whether the faucet is active
    bool public isActive = true;
    
    /// @notice Total tokens claimed from faucet
    uint256 public totalClaimedTokens;
    
    // ========== EVENTS ==========
    
    event TokensClaimed(address indexed claimer, uint256 amount, uint256 timestamp);
    event ClaimAmountUpdated(uint256 newAmount);
    event FaucetToggled(bool isActive);
    event TokensWithdrawn(address indexed owner, uint256 amount);
    event TokensDeposited(address indexed depositor, uint256 amount);
    
    // ========== CONSTRUCTOR ==========
    
    /// @notice Initialize the faucet with CLRToken address
    /// @param _clrTokenAddress Address of the CLRToken contract
    constructor(address _clrTokenAddress) Ownable(msg.sender) {
        require(_clrTokenAddress != address(0), "Invalid token address");
        clrToken = IERC20(_clrTokenAddress);
    }
    
    // ========== PUBLIC FUNCTIONS ==========
    
    /// @notice Claim CLR tokens from the faucet
    function claim() external nonReentrant {
        require(isActive, "Faucet is currently inactive");
        require(claimAmount > 0, "Claim amount must be greater than 0");
        
        // Check faucet has sufficient balance
        require(
            clrToken.balanceOf(address(this)) >= claimAmount,
            "Faucet has insufficient balance"
        );
        
        // Update total claimed
        totalClaimedTokens += claimAmount;
        
        // Transfer tokens
        require(
            clrToken.transfer(msg.sender, claimAmount),
            "Token transfer failed"
        );
        
        emit TokensClaimed(msg.sender, claimAmount, block.timestamp);
    }

    
    /// @notice Get faucet balance
    /// @return Current balance of CLR tokens in the faucet
    function getFaucetBalance() external view returns (uint256) {
        return clrToken.balanceOf(address(this));
    }
    
    // ========== OWNER FUNCTIONS ==========
    
    /// @notice Update the claim amount
    /// @param _newClaimAmount New amount to dispense per claim
    function setClaimAmount(uint256 _newClaimAmount) external onlyOwner {
        require(_newClaimAmount > 0, "Claim amount must be greater than 0");
        claimAmount = _newClaimAmount;
        emit ClaimAmountUpdated(_newClaimAmount);
    }

    
    /// @notice Toggle faucet active/inactive
    /// @param _isActive Whether the faucet should be active
    function setFaucetActive(bool _isActive) external onlyOwner {
        isActive = _isActive;
        emit FaucetToggled(_isActive);
    }
    
    /// @notice Deposit tokens to the faucet
    /// @param _amount Amount of tokens to deposit
    function depositTokens(uint256 _amount) external {
        require(_amount > 0, "Deposit amount must be greater than 0");
        require(
            clrToken.transferFrom(msg.sender, address(this), _amount),
            "Token transfer failed"
        );
        emit TokensDeposited(msg.sender, _amount);
    }
    
    /// @notice Withdraw tokens from the faucet
    /// @param _amount Amount of tokens to withdraw
    function withdrawTokens(uint256 _amount) external onlyOwner nonReentrant {
        require(_amount > 0, "Withdrawal amount must be greater than 0");
        require(
            clrToken.balanceOf(address(this)) >= _amount,
            "Insufficient faucet balance"
        );
        require(
            clrToken.transfer(msg.sender, _amount),
            "Token transfer failed"
        );
        emit TokensWithdrawn(msg.sender, _amount);
    }
    
    /// @notice Emergency withdrawal of all remaining tokens
    function emergencyWithdraw() external onlyOwner nonReentrant {
        uint256 balance = clrToken.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        require(
            clrToken.transfer(msg.sender, balance),
            "Token transfer failed"
        );
        emit TokensWithdrawn(msg.sender, balance);
    }
}
