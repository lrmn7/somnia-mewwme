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

contract MewwmePremium is ReentrancyGuard {
    address public admin;
    address public treasury;
    uint256 public premiumGuildBasicPrice;  
    uint256 public premiumGuildPlusPrice;   
    uint256 public premiumGuildProPrice;    
    uint256 public premiumDuration = 30 days;

    struct PremiumRecord {
        string discordUserId;
        string plan;          
        uint256 amount;
        uint256 quota;        
        uint256 activatedAt;
        uint256 expiresAt;
    }

    mapping(address => PremiumRecord) public premiumRecords;

    event PremiumPurchased(
        address indexed buyer,
        string discordUserId,
        string plan,
        uint256 amount,
        uint256 quota,
        uint256 expiresAt,
        uint256 timestamp
    );

    event PremiumPriceUpdated(string plan, uint256 oldPrice, uint256 newPrice);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);


    modifier onlyAdmin() {
        require(msg.sender == admin, "Premium: caller is not admin");
        _;
    }

    constructor(address _treasury) {
        require(_treasury != address(0), "Premium: treasury is zero address");
        admin = msg.sender;
        treasury = _treasury;
        premiumGuildBasicPrice = 3 ether;  
        premiumGuildPlusPrice = 7 ether;    
        premiumGuildProPrice = 10 ether;   
    }

    function purchasePremium(
        string calldata _discordUserId,
        string calldata _plan
    ) external payable nonReentrant {
        require(bytes(_discordUserId).length > 0, "Premium: empty user ID");

        uint256 requiredPrice = _getPlanPrice(_plan);
        require(requiredPrice > 0, "Premium: invalid plan");
        require(msg.value >= requiredPrice, "Premium: insufficient payment");

        uint256 quota = _getPlanQuota(_plan);
        uint256 expiresAt = block.timestamp + premiumDuration;

        PremiumRecord storage existing = premiumRecords[msg.sender];
        if (existing.expiresAt > block.timestamp) {
            expiresAt = existing.expiresAt + premiumDuration;
        }

        premiumRecords[msg.sender] = PremiumRecord({
            discordUserId: _discordUserId,
            plan: _plan,
            amount: msg.value,
            quota: quota,
            activatedAt: block.timestamp,
            expiresAt: expiresAt
        });

        (bool sent, ) = treasury.call{value: requiredPrice}("");
        require(sent, "Premium: payment to treasury failed");

        if (msg.value > requiredPrice) {
            uint256 refund = msg.value - requiredPrice;
            (bool refundOk, ) = msg.sender.call{value: refund}("");
            require(refundOk, "Premium: refund failed");
        }

        emit PremiumPurchased(
            msg.sender,
            _discordUserId,
            _plan,
            requiredPrice,
            quota,
            expiresAt,
            block.timestamp
        );
    }

    function isPremiumActive(address _wallet) external view returns (bool) {
        return premiumRecords[_wallet].expiresAt > block.timestamp;
    }

    function getPremiumRecord(address _wallet) external view returns (PremiumRecord memory) {
        return premiumRecords[_wallet];
    }

    function getPlanPrice(string calldata _plan) external view returns (uint256) {
        return _getPlanPrice(_plan);
    }

    function setPremiumPrice(string calldata _plan, uint256 _price) external onlyAdmin {
        require(_price > 0, "Premium: price must be > 0");
        uint256 oldPrice;

        bytes32 planHash = keccak256(bytes(_plan));
        if (planHash == keccak256("guild_basic")) {
            oldPrice = premiumGuildBasicPrice;
            premiumGuildBasicPrice = _price;
        } else if (planHash == keccak256("guild_plus")) {
            oldPrice = premiumGuildPlusPrice;
            premiumGuildPlusPrice = _price;
        } else if (planHash == keccak256("guild_pro")) {
            oldPrice = premiumGuildProPrice;
            premiumGuildProPrice = _price;
        } else {
            revert("Premium: invalid plan name");
        }

        emit PremiumPriceUpdated(_plan, oldPrice, _price);
    }

    function setPremiumDuration(uint256 _duration) external onlyAdmin {
        require(_duration > 0, "Premium: duration must be > 0");
        premiumDuration = _duration;
    }

    function setTreasury(address _newTreasury) external onlyAdmin {
        require(_newTreasury != address(0), "Premium: treasury is zero address");
        address old = treasury;
        treasury = _newTreasury;
        emit TreasuryUpdated(old, _newTreasury);
    }

    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Premium: admin is zero address");
        address old = admin;
        admin = _newAdmin;
        emit AdminTransferred(old, _newAdmin);
    }

    function _getPlanPrice(string calldata _plan) internal view returns (uint256) {
        bytes32 planHash = keccak256(bytes(_plan));
        if (planHash == keccak256("guild_basic")) return premiumGuildBasicPrice;
        if (planHash == keccak256("guild_plus")) return premiumGuildPlusPrice;
        if (planHash == keccak256("guild_pro")) return premiumGuildProPrice;
        return 0;
    }

    function _getPlanQuota(string calldata _plan) internal pure returns (uint256) {
        bytes32 planHash = keccak256(bytes(_plan));
        if (planHash == keccak256("guild_basic")) return 1;
        if (planHash == keccak256("guild_plus")) return 3;
        if (planHash == keccak256("guild_pro")) return 5;
        return 0;
    }
}
