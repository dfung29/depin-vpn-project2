// Sources flattened with hardhat v3.0.16 https://hardhat.org

// SPDX-License-Identifier: MIT

// File npm/@openzeppelin/contracts@5.4.0/utils/Context.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}


// File npm/@openzeppelin/contracts@5.4.0/access/Ownable.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File npm/@openzeppelin/contracts@5.4.0/token/ERC20/IERC20.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}


// File npm/@openzeppelin/contracts@5.4.0/utils/ReentrancyGuard.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}


// File contracts/CLRFaucet.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.28;
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

