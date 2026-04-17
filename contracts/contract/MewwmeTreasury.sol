// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


contract MewwmeTreasury {
    address public admin;

    event Received(address indexed from, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed to, uint256 amount, uint256 timestamp);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Treasury: caller is not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    receive() external payable {
        emit Received(msg.sender, msg.value, block.timestamp);
    }

    fallback() external payable {
        emit Received(msg.sender, msg.value, block.timestamp);
    }

    function withdraw(address _to, uint256 _amount) external onlyAdmin {
        require(_to != address(0), "Treasury: recipient is zero address");
        require(_amount > 0, "Treasury: amount must be > 0");
        require(_amount <= address(this).balance, "Treasury: insufficient balance");

        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Treasury: withdrawal failed");

        emit Withdrawn(_to, _amount, block.timestamp);
    }

    function withdrawAll(address _to) external onlyAdmin {
        require(_to != address(0), "Treasury: recipient is zero address");
        uint256 bal = address(this).balance;
        require(bal > 0, "Treasury: no balance");

        (bool success, ) = _to.call{value: bal}("");
        require(success, "Treasury: withdrawal failed");

        emit Withdrawn(_to, bal, block.timestamp);
    }

    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Treasury: admin is zero address");
        address old = admin;
        admin = _newAdmin;
        emit AdminTransferred(old, _newAdmin);
    }

    function balance() external view returns (uint256) {
        return address(this).balance;
    }
}
