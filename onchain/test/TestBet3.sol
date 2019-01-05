pragma solidity ^0.4.24;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Bet.sol";

contract TestBet3 {
    Bet gamesInstance;

    constructor() public {
        gamesInstance = Bet(DeployedAddresses.Bet());
    }

    function testGameActions() public {
        uint8 status;
        uint amount;
        string memory nick1;
        string memory nick2;

        bytes32 hash = gamesInstance.saltedHash(123, "my salt goes here");
        uint32 gameIdx = gamesInstance.createGame(hash, "John");
        gamesInstance.acceptGame(gameIdx, 234, "Mary");
        gamesInstance.confirmGame(gameIdx, 123, "my salt goes here");
        gamesInstance.electWinner(gameIdx);

        (status, amount, nick1, nick2) = gamesInstance.getGameInfo(gameIdx);
        Assert.equal(uint(status), 12, "The game should be won by player 2");
    }
}
