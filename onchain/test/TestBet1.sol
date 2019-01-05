pragma solidity ^0.4.24;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Bet.sol";

contract TestBet1 {
    Bet gamesInstance;

    constructor() public {
        gamesInstance = Bet(DeployedAddresses.Bet());
    }

    function testInitiallyEmpty() public {
        Assert.equal(gamesInstance.getOpenGames().length, 0, "The games array should be empty at the begining");
    }

    function testHashingFunction() public {

        bytes32 hash1 = gamesInstance.saltedHash(123, "my salt here");
        bytes32 hash2 = gamesInstance.saltedHash(123, "my salt 2 here");
        bytes32 hash3 = gamesInstance.saltedHash(234, "my salt here");
       
        Assert.isNotZero(hash1, "Salted hash should be valid");

        Assert.notEqual(hash1, hash2, "Different salt should produce different hashes");
        Assert.notEqual(hash1, hash3, "Different numbers should produce different hashes");
        Assert.notEqual(hash2, hash3, "Different numbers and salt should produce different hashes");
    }

    function testGameCreation() public {
        uint8 status;
        uint amount;
        string memory nick1;
        string memory nick2;
        uint lastTransaction;

        bytes32 hash = gamesInstance.saltedHash(123, "my salt goes here");
        uint32 gameIdx = gamesInstance.createGame(hash, "John");
        Assert.equal(uint(gameIdx), 0, "The first game should have index 0");

        uint32[] memory openGames = gamesInstance.getOpenGames();
        Assert.equal(openGames.length, 1, "One game should have been created");
        Assert.equal(uint(openGames[0]), 0, "The first game should have index 0");
        (status, amount, nick1, nick2) = gamesInstance.getGameInfo(gameIdx);
        Assert.equal(uint(status), 0, "The game should not be started");
        Assert.equal(amount, 0, "The initial amount should be zero");
        Assert.equal(nick1, "John", "The nick should be John");
        Assert.isEmpty(nick2, "Nick2 should be empty");

        lastTransaction = gamesInstance.getGameTimestamp(gameIdx);
        Assert.isAbove(lastTransaction, 0, "The first player's transaction timestamp should be set");
    }

    function testGameAccepted() public {
        uint8 status;
        uint amount;
        string memory nick1;
        string memory nick2;
        uint lastTransaction;

        uint32[] memory openGames = gamesInstance.getOpenGames();
        Assert.equal(openGames.length, 1, "One game should be available");

        uint32 gameIdx = openGames[0];

        gamesInstance.acceptGame(gameIdx, 234, "Mary");

        openGames = gamesInstance.getOpenGames();
        Assert.equal(openGames.length, 0, "The game should not be available anymore");

        (status, amount, nick1, nick2) = gamesInstance.getGameInfo(gameIdx);

        Assert.equal(uint(status), 0, "The game should not be started");
        Assert.equal(amount, 0, "The initial amount should be zero");
        Assert.equal(nick1, "John", "The nick should be John");
        Assert.equal(nick2, "Mary", "The nick should be Mary");

        lastTransaction = gamesInstance.getGameTimestamp(gameIdx);
        Assert.isAbove(lastTransaction, 0, "The first player's transaction timestamp should be set");
    }
}
