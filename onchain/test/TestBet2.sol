pragma solidity ^0.4.24;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Bet.sol";

contract TestBet2 {
    Bet gamesInstance;

    constructor() public {
        gamesInstance = Bet(DeployedAddresses.Bet());
    }

    function testGameConfirmed() public {
        uint8 status;
        uint amount;
        string memory nick1;
        string memory nick2;

        bytes32 hash = gamesInstance.saltedHash(123, "my salt goes here");
        uint32 gameIdx = gamesInstance.createGame(hash, "John");
        gamesInstance.acceptGame(gameIdx, 234, "Mary");
        gamesInstance.confirmGame(gameIdx, 123, "my salt goes here");
        (status, amount, nick1, nick2) = gamesInstance.getGameInfo(gameIdx);
    
        Assert.equal(uint(status), 2, "odd --> player 2");
        Assert.equal(amount, 0, "The initial amount should be zero");
        Assert.equal(nick1, "John", "The nick should be John");
        Assert.equal(nick2, "Mary", "The nick should be Mary");

        // Try to cheat
        hash = gamesInstance.saltedHash(123, "my salt goes here");
        gameIdx = gamesInstance.createGame(hash, "John");
        gamesInstance.acceptGame(gameIdx, 234, "Mary");
        gamesInstance.confirmGame(gameIdx, 100, "my salt goes here");

        // The hash does not correspond: 100 != 123 
        (status, amount, nick1, nick2) = gamesInstance.getGameInfo(gameIdx);
        Assert.equal(uint(status), 12, "The game should be won by player 2 due to cheating by p1");
    }
}
