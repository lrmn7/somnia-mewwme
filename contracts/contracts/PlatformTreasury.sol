// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PlatformTreasury
 * @notice Collects platform fees (native STT) from GuildTip contracts.
 *         Only the owner can withdraw accumulated STT.
 */
contract PlatformTreasury is ReentrancyGuard {
    address public owner;

    event FeesClaimed(address indexed owner, uint256 amount);
    event OwnerTransferred(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "PlatformTreasury: not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    receive() external payable {}

    function claim() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "PlatformTreasury: no funds");
        (bool success, ) = owner.call{value: balance}("");
        require(success, "PlatformTreasury: transfer failed");
        emit FeesClaimed(owner, balance);
    }

    function claimAmount(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "PlatformTreasury: zero amount");
        require(address(this).balance >= amount, "PlatformTreasury: insufficient balance");
        (bool success, ) = owner.call{value: amount}("");
        require(success, "PlatformTreasury: transfer failed");
        emit FeesClaimed(owner, amount);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "PlatformTreasury: invalid owner");
        emit OwnerTransferred(owner, newOwner);
        owner = newOwner;
    }
}
