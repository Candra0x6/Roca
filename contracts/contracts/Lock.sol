// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title Lock
 * @author Arisan+ Team
 * @notice A simple time-locked contract for testing Hardhat setup
 * @dev This contract locks funds until a specified unlock time
 */
contract Lock {
    /// @notice The timestamp when funds can be withdrawn
    uint256 public unlockTime;
    
    /// @notice The owner of the locked funds
    address payable public owner;

    /// @notice Emitted when funds are withdrawn
    /// @param amount The amount withdrawn in wei
    /// @param when The timestamp of withdrawal
    event Withdrawal(uint256 amount, uint256 when);

    /// @notice Error thrown when unlock time is not in the future
    error UnlockTimeNotInFuture();
    
    /// @notice Error thrown when caller is not the owner
    error NotOwner();
    
    /// @notice Error thrown when it's too early to withdraw
    error TooEarlyToWithdraw();

    /**
     * @notice Creates a new Lock contract
     * @dev The contract must receive some ETH to lock
     * @param _unlockTime The timestamp when funds can be withdrawn
     */
    constructor(uint256 _unlockTime) payable {
        if (block.timestamp >= _unlockTime) {
            revert UnlockTimeNotInFuture();
        }

        unlockTime = _unlockTime;
        owner = payable(msg.sender);
    }

    /**
     * @notice Withdraws all locked funds to the owner
     * @dev Can only be called by the owner after unlock time
     */
    function withdraw() external {
        if (block.timestamp < unlockTime) {
            revert TooEarlyToWithdraw();
        }
        
        if (msg.sender != owner) {
            revert NotOwner();
        }

        uint256 amount = address(this).balance;
        
        emit Withdrawal(amount, block.timestamp);
        
        // Effects-interactions pattern: emit event before external call
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Transfer failed");
    }

    /**
     * @notice Returns the current balance of the contract
     * @return The balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Returns the time remaining until unlock
     * @return The time remaining in seconds, or 0 if already unlocked
     */
    function getTimeRemaining() external view returns (uint256) {
        if (block.timestamp >= unlockTime) {
            return 0;
        }
        return unlockTime - block.timestamp;
    }
}
