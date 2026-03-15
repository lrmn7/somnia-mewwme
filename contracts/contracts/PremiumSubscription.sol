// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PremiumSubscription is ReentrancyGuard {
    address public admin;

    struct Tier {
        uint256 price;  // in wei (18 decimals)
        uint256 quota;  // number of servers
        bool active;
    }

    // tierId => Tier (e.g. 1=basic, 2=plus, 3=pro)
    mapping(uint256 => Tier) public tiers;
    uint256 public tierCount;

    struct Subscription {
        address wallet;
        uint256 tierId;
        uint256 amount;
        uint256 timestamp;
    }

    Subscription[] public subscriptions;

    event SubscriptionCreated(
        address indexed wallet,
        uint256 tierId,
        uint256 amount,
        uint256 quota,
        uint256 timestamp
    );

    event TierUpdated(uint256 tierId, uint256 price, uint256 quota, bool active);

    modifier onlyAdmin() {
        require(msg.sender == admin, "PremiumSubscription: caller is not admin");
        _;
    }

    constructor() {
        admin = msg.sender;

        // Default tiers
        tiers[1] = Tier(2 ether, 1, true);  // Basic: 2 STT, 1 server
        tiers[2] = Tier(3 ether, 3, true);  // Plus:  3 STT, 3 servers
        tiers[3] = Tier(5 ether, 5, true);  // Pro:   5 STT, 5 servers
        tierCount = 3;
    }

    function subscribe(uint256 tierId) external payable nonReentrant {
        Tier memory tier = tiers[tierId];
        require(tier.active, "PremiumSubscription: tier not active");
        require(tier.price > 0, "PremiumSubscription: tier not found");
        require(msg.value == tier.price, "PremiumSubscription: incorrect payment");

        subscriptions.push(Subscription({
            wallet: msg.sender,
            tierId: tierId,
            amount: tier.price,
            timestamp: block.timestamp
        }));

        emit SubscriptionCreated(msg.sender, tierId, tier.price, tier.quota, block.timestamp);
    }

    function setTier(uint256 tierId, uint256 price, uint256 quota, bool active) external onlyAdmin {
        require(price > 0, "PremiumSubscription: invalid price");
        require(quota > 0, "PremiumSubscription: invalid quota");
        tiers[tierId] = Tier(price, quota, active);
        if (tierId > tierCount) {
            tierCount = tierId;
        }
        emit TierUpdated(tierId, price, quota, active);
    }

    function getTier(uint256 tierId) external view returns (uint256 price, uint256 quota, bool active) {
        Tier memory t = tiers[tierId];
        return (t.price, t.quota, t.active);
    }

    function withdraw() external onlyAdmin nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "PremiumSubscription: no funds");
        (bool success, ) = admin.call{value: balance}("");
        require(success, "PremiumSubscription: transfer failed");
    }

    function getSubscriptionCount() external view returns (uint256) {
        return subscriptions.length;
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
