// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./GuildTip.sol";

contract TipFactory {
    address public admin;
    address public treasury; // PlatformTreasury contract address
    uint256 public defaultDeveloperDonationBps;

    mapping(string => address) public guildContracts;
    string[] public allGuildIds;

    event GuildTipCreated(
        string indexed guildId,
        address indexed contractAddress,
        address indexed owner
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "TipFactory: caller is not admin");
        _;
    }

    constructor(
        address _treasury,
        uint256 _defaultDeveloperDonationBps
    ) {
        require(_treasury != address(0), "TipFactory: invalid treasury");
        admin = msg.sender;
        treasury = _treasury;
        defaultDeveloperDonationBps = _defaultDeveloperDonationBps;
    }

    function createGuildTip(
        string calldata guildId,
        address guildOwner
    ) external returns (address) {
        require(guildContracts[guildId] == address(0), "TipFactory: guild already has a contract");
        require(guildOwner != address(0), "TipFactory: invalid owner");

        GuildTip tipContract = new GuildTip(
            guildId,
            guildOwner,
            treasury,
            defaultDeveloperDonationBps
        );

        address contractAddress = address(tipContract);
        guildContracts[guildId] = contractAddress;
        allGuildIds.push(guildId);

        emit GuildTipCreated(guildId, contractAddress, guildOwner);
        return contractAddress;
    }

    function getGuildContract(string calldata guildId) external view returns (address) {
        return guildContracts[guildId];
    }

    function getTotalGuilds() external view returns (uint256) {
        return allGuildIds.length;
    }

    function setTreasury(address _treasury) external onlyAdmin {
        require(_treasury != address(0), "TipFactory: invalid treasury");
        treasury = _treasury;
    }

    function setDefaultDonationBps(uint256 _bps) external onlyAdmin {
        require(_bps <= 1000, "TipFactory: donation too high");
        defaultDeveloperDonationBps = _bps;
    }
}
