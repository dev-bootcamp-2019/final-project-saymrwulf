pragma solidity ^0.4.24;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Bet.sol";

contract TestBet4 {
    Bet gamesInstance;
    uint public initialBalance = 1 ether;

    constructor() public {
        gamesInstance = Bet(DeployedAddresses.Bet());
    }

    function testWinnerWithdrawal() public {
        uint8 status;
        uint amount;
        string memory nick1;
        string memory nick2;

        bytes32 hash = gamesInstance.saltedHash(100, "my salt goes here");
        uint32 gameIdx = gamesInstance.createGame.value(0.01 ether)(hash, "John");
        gamesInstance.acceptGame.value(0.01 ether)(gameIdx, 234, "Mary");
        gamesInstance.confirmGame(gameIdx, 100, "my salt goes here");
        gamesInstance.electWinner(gameIdx);

        (status, amount, nick1, nick2) = gamesInstance.getGameInfo(gameIdx);
        Assert.equal(uint(status), 11, "The game should be won by player 1");

        uint balancePre = address(this).balance;
        gamesInstance.withdraw(gameIdx);
        uint balancePost = address(this).balance;

        Assert.equal(balancePre + 0.02 ether, balancePost, "Withdrawal should have transfered 0.02 ether");
    }

    function() public payable {}
}
