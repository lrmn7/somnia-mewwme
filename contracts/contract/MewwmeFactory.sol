// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

contract MewwmeGuildTip is ReentrancyGuard {
    address public owner;
    address public treasury;
    uint256 public constant PLATFORM_FEE_BPS = 150;
    uint256 public totalDonations;

    event Donated(
        address indexed sender,
        uint256 amount,
        uint256 fee,
        string message,
        uint256 timestamp
    );

    event Claimed(
        address indexed owner,
        uint256 amount,
        uint256 timestamp
    );

    event OwnerTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "GuildTip: caller is not the owner");
        _;
    }

    constructor(address _owner, address _treasury) {
        require(_owner != address(0), "GuildTip: invalid owner");
        require(_treasury != address(0), "GuildTip: invalid treasury");
        owner = _owner;
        treasury = _treasury;
    }

    function donate(string calldata message) external payable nonReentrant {
        require(msg.value > 0, "GuildTip: amount must be > 0");

        uint256 fee = (msg.value * PLATFORM_FEE_BPS) / 10000;
        uint256 net = msg.value - fee;

        totalDonations += net;

        if (fee > 0) {
            (bool feeOk, ) = treasury.call{value: fee}("");
            require(feeOk, "GuildTip: fee transfer failed");
        }

        emit Donated(msg.sender, net, fee, message, block.timestamp);
    }

    receive() external payable {
        require(msg.value > 0, "GuildTip: amount must be > 0");

        uint256 fee = (msg.value * PLATFORM_FEE_BPS) / 10000;
        uint256 net = msg.value - fee;

        totalDonations += net;

        if (fee > 0) {
            (bool feeOk, ) = treasury.call{value: fee}("");
            require(feeOk, "GuildTip: fee transfer failed");
        }

        emit Donated(msg.sender, net, fee, "", block.timestamp);
    }

    function claim() external onlyOwner nonReentrant {
        uint256 bal = address(this).balance;
        require(bal > 0, "GuildTip: no funds to claim");

        (bool ok, ) = owner.call{value: bal}("");
        require(ok, "GuildTip: claim transfer failed");

        emit Claimed(owner, bal, block.timestamp);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "GuildTip: new owner is zero address");
        address prev = owner;
        owner = newOwner;
        emit OwnerTransferred(prev, newOwner);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

contract MewwmeFactory {
    address public admin;
    address public treasury;
    mapping(string => address) public guildContracts;

    string[] public guildIds;

    event GuildCreated(
        string guildId,
        address guildAddress,
        address indexed owner,
        uint256 timestamp
    );

    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Factory: caller is not admin");
        _;
    }


    constructor(address _treasury) {
        require(_treasury != address(0), "Factory: treasury is zero address");
        admin = msg.sender;
        treasury = _treasury;
    }

    function createGuild(
        string calldata _guildId,
        address _owner
    ) external returns (address) {
        require(bytes(_guildId).length > 0, "Factory: empty guild ID");
        require(_owner != address(0), "Factory: owner is zero address");
        require(
            guildContracts[_guildId] == address(0),
            "Factory: guild already exists"
        );

        MewwmeGuildTip guildTip = new MewwmeGuildTip(_owner, treasury);

        address guildAddress = address(guildTip);
        guildContracts[_guildId] = guildAddress;
        guildIds.push(_guildId);

        emit GuildCreated(_guildId, guildAddress, _owner, block.timestamp);

        return guildAddress;
    }

    function getGuild(string calldata _guildId) external view returns (address) {
        return guildContracts[_guildId];
    }

    function totalGuilds() external view returns (uint256) {
        return guildIds.length;
    }

    function setTreasury(address _newTreasury) external onlyAdmin {
        require(_newTreasury != address(0), "Factory: treasury is zero address");
        address old = treasury;
        treasury = _newTreasury;
        emit TreasuryUpdated(old, _newTreasury);
    }

    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Factory: admin is zero address");
        address old = admin;
        admin = _newAdmin;
        emit AdminTransferred(old, _newAdmin);
    }
}
