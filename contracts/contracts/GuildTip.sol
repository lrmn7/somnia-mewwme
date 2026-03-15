// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract GuildTip is ReentrancyGuard {
    address public owner;
    address public developerWallet;
    string public guildId;

    uint256 public totalTips;
    uint256 public developerDonationBps; // basis points (e.g. 150 = 1.5%)

    event TipReceived(
        string indexed guildId,
        address indexed sender,
        uint256 amount,
        string message,
        uint256 timestamp
    );

    event FundsClaimed(address indexed owner, uint256 amount);
    event DeveloperDonationUpdated(uint256 newBps);

    modifier onlyOwner() {
        require(msg.sender == owner, "GuildTip: caller is not the owner");
        _;
    }

    constructor(
        string memory _guildId,
        address _owner,
        address _developerWallet,
        uint256 _developerDonationBps
    ) {
        require(_owner != address(0), "GuildTip: invalid owner");
        require(_developerDonationBps <= 1000, "GuildTip: donation too high"); // max 10%

        guildId = _guildId;
        owner = _owner;
        developerWallet = _developerWallet;
        developerDonationBps = _developerDonationBps;
    }

    function tip(string calldata message) external payable nonReentrant {
        require(msg.value > 0, "GuildTip: amount must be > 0");

        if (developerDonationBps > 0 && developerWallet != address(0)) {
            uint256 devAmount = (msg.value * developerDonationBps) / 10000;
            if (devAmount > 0) {
                (bool success, ) = developerWallet.call{value: devAmount}("");
                require(success, "GuildTip: fee transfer failed");
            }
        }

        totalTips += msg.value;

        emit TipReceived(guildId, msg.sender, msg.value, message, block.timestamp);
    }

    function claim() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "GuildTip: no funds to claim");

        (bool success, ) = owner.call{value: balance}("");
        require(success, "GuildTip: transfer failed");
        emit FundsClaimed(owner, balance);
    }

    function setDeveloperDonationBps(uint256 _bps) external onlyOwner {
        require(_bps <= 1000, "GuildTip: donation too high");
        developerDonationBps = _bps;
        emit DeveloperDonationUpdated(_bps);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
