const Bet = artifacts.require("./Bet.sol");
let gamesInstance;

contract('Bet', function (accounts) {
    const player1 = accounts[0];
    const player2 = accounts[1];
    const randomUser = accounts[5];
    const testingGasPrice = 100000000000;

    it("should be deployed", async function () {
        gamesInstance = await Bet.deployed();
        assert.isOk(gamesInstance, "instance should not be null");
        assert.equal(typeof gamesInstance, "object", "Instance should be an object");

        const timeout = await gamesInstance.timeout.call();
        assert.equal(timeout.toNumber(), 2, "The base timeout to test should be set to 2");

    });

    it("should hash properly", async function () {
        let hash1 = await gamesInstance.saltedHash.call(123, "my salt 1")
        let hash2 = await gamesInstance.saltedHash.call(123, "my salt 2")
        let hash3 = await gamesInstance.saltedHash.call(234, "my salt 1")

        assert.isOk(hash1, "Hash should not be empty")
        assert.isOk(hash2, "Hash should not be empty")
        assert.isOk(hash3, "Hash should not be empty")

        assert.notEqual(hash1, hash2, "Different salt should produce different hashes")
        assert.notEqual(hash1, hash3, "Different numbers should produce different hashes")
        assert.notEqual(hash2, hash3, "Different numbers and salt should produce different hashes")
    })

    it("should start with no games at the begining", async function () {
        let gamesIdx = await gamesInstance.getOpenGames.call();
        assert.deepEqual(gamesIdx, [], "Should have zero games at the begining");
    });

    // Bet.createGame

    it("should create a game with no money", async function () {
        const eventWatcher = gamesInstance.GameCreated();
        let hash = await gamesInstance.saltedHash.call(123, "my salt 1");

        await gamesInstance.createGame(hash, "John");

        assert.equal(await web3.eth.getBalance(gamesInstance.address).toNumber(), 0, "The contract should have registered a zero amount of ether owed to the players");

        const emittedEvents = await eventWatcher.get();
        assert.isOk(emittedEvents, "Events should be an array");
        assert.equal(emittedEvents.length, 1, "There should be one event");
        assert.isOk(emittedEvents[0], "There should be one event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), 0, "The game should have index zero");
        
        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();

        let gamesIdx = await gamesInstance.getOpenGames.call();
        gamesIdx = gamesIdx.map(n => n.toNumber());
        assert.include(gamesIdx, gameIdx, "Should include the new game");

        let [status, amount, nick1, nick2, ...rest] = await gamesInstance.getGameInfo(gameIdx);
        assert.equal(status.toNumber(), 0, "The game should not be started");
        assert.equal(amount.toNumber(), 0, "The game should have no money");
        assert.equal(nick1, "John", "The player 1 should be John");
        assert.equal(nick2, "", "The player 2 should be empty");
        assert.deepEqual(rest, [], "The response should have 5 elements");

        let lastTransaction = await gamesInstance.getGameTimestamp(gameIdx);
        assert.isAbove(lastTransaction.toNumber(), 0, "The last timestamp should be set");

        let [p1, p2, ...rest3] = await gamesInstance.getGamePlayers(gameIdx);
        assert.equal(p1, player1, "The address of player 1 should be set");
        assert.equal(p2, "0x0000000000000000000000000000000000000000", "The address of player 2 should be empty");
        assert.deepEqual(rest3, [], "The response should have 2 elements");
    });

    it("should create a game with money", async function () {
        const eventWatcher = gamesInstance.GameCreated();
        let hash = await gamesInstance.saltedHash.call(123, "my salt 1");

        await gamesInstance.createGame(hash, "Jane", { value: web3.toWei(0.01, 'ether') });

        let balance = await web3.eth.getBalance(gamesInstance.address);
        assert.equal(balance.comparedTo(web3.toWei(0.01, 'ether')), 0, "The contract should have registered 0.01 ether owed to the players");

        const emittedEvents = await eventWatcher.get();
        assert.isOk(emittedEvents, "Events should be an array");
        assert.equal(emittedEvents.length, 1, "There should be one event");
        assert.isOk(emittedEvents[0], "There should be one event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), 1, "The game should have index one");

        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();

        let gamesIdx = await gamesInstance.getOpenGames.call();
        gamesIdx = gamesIdx.map(n => n.toNumber());
        assert.include(gamesIdx, gameIdx, "Should include the new game");

        let [status, amount, nick1, nick2, ...rest] = await gamesInstance.getGameInfo(gameIdx);
        assert.equal(status.toNumber(), 0, "The game should not be started");

        assert.equal(amount.comparedTo(web3.toWei(0.01, 'ether')), 0, "The game should have 0.01 ether");
        assert.equal(nick1, "Jane", "The player 1 should be Jane");
        assert.equal(nick2, "", "The player 2 should be empty");
        assert.deepEqual(rest, [], "The response should have 5 elements");

        let lastTransaction = await gamesInstance.getGameTimestamp(gameIdx);
        assert.isAbove(lastTransaction.toNumber(), 0, "The last timestamp should be set");

        let [p1, p2, ...rest3] = await gamesInstance.getGamePlayers(gameIdx);
        assert.equal(p1, player1, "The address of player 1 should be set");
        assert.equal(p2, "0x0000000000000000000000000000000000000000", "The address of player 2 should be empty");
        assert.deepEqual(rest3, [], "The response should have 2 elements");
    });

    // Bet.acceptGame

    it("should reject accepting a non-existing game", async function () {
        try {
            await gamesInstance.acceptGame(1234, 0, "Mary");
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });

    it("should reject accepting games with a different amount of money than expected", async function () {
        const eventWatcher = gamesInstance.GameCreated();

        let hash = await gamesInstance.saltedHash.call(123, "my salt 1");
        await gamesInstance.createGame(hash, "Johny", { value: web3.toWei(0.02, 'ether') });

        let balance = await web3.eth.getBalance(gamesInstance.address);
        assert.equal(balance.comparedTo(web3.toWei(0.03, 'ether')), 0, "The contract should have registered 0.02 ether owed to the players");

        const emittedEvents = await eventWatcher.get();
        assert.isOk(emittedEvents, "Events should be an array");
        assert.equal(emittedEvents.length, 1, "There should be one event");
        assert.isOk(emittedEvents[0], "There should be one event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), 2, "The game should have index two");

        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();

        let gamesIdx = await gamesInstance.getOpenGames.call();
        gamesIdx = gamesIdx.map(n => n.toNumber());
        assert.include(gamesIdx, gameIdx, "Should include the new game");

        let [status, amount, nick1, nick2, ...rest] = await gamesInstance.getGameInfo(gameIdx);
        assert.equal(status.toNumber(), 0, "The game should not be started");

        assert.equal(amount.comparedTo(web3.toWei(0.02, 'ether')), 0, "The game should have 0.02 ether");
        assert.equal(nick1, "Johny", "The player 1 should be Johny");
        assert.equal(nick2, "", "The player 2 should be empty");
        assert.deepEqual(rest, [], "The response should have 5 elements");

        try {
            await gamesInstance.acceptGame(gameIdx, 0, "Kathy");
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });

    it("should accept an available game", async function () {
        const creationEventWatcher = gamesInstance.GameCreated();
        const acceptanceEventWatcher = gamesInstance.GameAccepted();

        let hash = await gamesInstance.saltedHash.call(123, "my salt 1");

        // create game
        await gamesInstance.createGame(hash, "James", { value: web3.toWei(0.005, 'ether') });

        let balance = await web3.eth.getBalance(gamesInstance.address);
        assert.equal(balance.comparedTo(web3.toWei(0.035, 'ether')), 0, "The contract should have registered 0.005 ether owed to the players");

        let emittedEvents = await creationEventWatcher.get();
        assert.isOk(emittedEvents, "Events should be an array");
        assert.equal(emittedEvents.length, 1, "There should be one event");
        assert.isOk(emittedEvents[0], "There should be one event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), 3, "The game should have index three");

        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();

        let gamesIdx = await gamesInstance.getOpenGames.call();
        gamesIdx = gamesIdx.map(n => n.toNumber());
        assert.include(gamesIdx, gameIdx, "Should include the new game");

        let [status, amount, nick1, nick2, ...rest] = await gamesInstance.getGameInfo(gameIdx);
        assert.equal(status.toNumber(), 0, "The game should not be started");

        assert.equal(amount.comparedTo(web3.toWei(0.005, 'ether')), 0, "The game should have 0.005 ether");
        assert.equal(nick1, "James", "The player 1 should be James");
        assert.equal(nick2, "", "The player 2 should be still empty");
        assert.deepEqual(rest, [], "The response should have 5 elements");

        // accept game
        await gamesInstance.acceptGame(gameIdx, 0, "Kathy", { value: web3.toWei(0.005, 'ether'), from: player2 });

        balance = await web3.eth.getBalance(gamesInstance.address);
        assert.equal(balance.comparedTo(web3.toWei(0.04, 'ether')), 0, "The contract should have registered 0.005 more ether owed to the players");

        emittedEvents = await acceptanceEventWatcher.get();
        assert.isOk(emittedEvents, "Events should be an array");
        assert.equal(emittedEvents.length, 1, "There should be one accepted game event");
        assert.isOk(emittedEvents[0], "There should be one accepted game event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The game should have the last gameIdx");
        assert.equal(emittedEvents[0].args.opponent, player1, "The opponent should be player 1");

        [status, amount, nick1, nick2, ...rest] = await gamesInstance.getGameInfo(gameIdx);
        assert.equal(status.toNumber(), 0, "The game should not be started yet");

        assert.equal(amount.comparedTo(web3.toWei(0.005, 'ether')), 0, "The game should have 0.005 ether");
        assert.equal(nick1, "James", "The player 1 should be James");
        assert.equal(nick2, "Kathy", "The player 2 should be Kathy");
        assert.deepEqual(rest, [], "The response should have 5 elements");

        lastTransaction = await gamesInstance.getGameTimestamp(gameIdx);
        assert.isAbove(lastTransaction.toNumber(), 0, "The last timestamp should be set");

        [p1, p2, ...rest3] = await gamesInstance.getGamePlayers(gameIdx);
        assert.equal(p1, player1, "The address of player 1 should be set");
        assert.equal(p2, player2, "The address of player 2 should be set");
        assert.deepEqual(rest3, [], "The response should have 2 elements");
    });

    it("should reject accepting an already accepted game", async function () {
        const creationEventWatcher = gamesInstance.GameCreated();
        const acceptanceEventWatcher = gamesInstance.GameAccepted();

        let hash = await gamesInstance.saltedHash.call(123, "my salt 1");
        await gamesInstance.createGame(hash, "Jim");

        let emittedEvents = await creationEventWatcher.get();
        assert.isOk(emittedEvents, "Events should be an array");
        assert.equal(emittedEvents.length, 1, "There should be one event");
        assert.isOk(emittedEvents[0], "There should be one event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), 4, "The game should have index four");

        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();

        let gamesIdx = await gamesInstance.getOpenGames.call();
        gamesIdx = gamesIdx.map(n => n.toNumber());
        assert.include(gamesIdx, gameIdx, "Should include the new game");

        await gamesInstance.acceptGame(gameIdx, 0, "Dana", { from: player2 });

        emittedEvents = await acceptanceEventWatcher.get();
        assert.isOk(emittedEvents, "Events should be an array");
        assert.equal(emittedEvents.length, 1, "There should be one accepted game event");
        assert.isOk(emittedEvents[0], "There should be one accepted game event");
        assert.equal(emittedEvents[0].args.gameIdx.toNumber(), gameIdx, "The game should have the last gameIdx");

        try {
            await gamesInstance.acceptGame(gameIdx, 0, "Dana", { from: randomUser });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        try {
            await gamesInstance.acceptGame(gameIdx, 1, "Donna", { from: player2 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        try {
            await gamesInstance.acceptGame(gameIdx, 1, "Dolly");
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });

    it("should reject accepting a game if it is already started", async function () {
        const eventWatcher = gamesInstance.GameCreated();

        let hash = await gamesInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: player1});

        const emittedEvents = await eventWatcher.get();
        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();

        await gamesInstance.acceptGame(gameIdx, 200, "Dana", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 123, "initial salt", {from: player1});
        
        try {
            await gamesInstance.acceptGame(gameIdx, 150, "Jack", {from: randomUser});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should have been reverted. Instead, the error was: " + err.message);
        }
    });

    it("should reject accepting a game if it has already ended", async function () {
        const eventWatcher = gamesInstance.GameCreated();
        const endingWatcher = gamesInstance.GameEnded();
        
        let hash = await gamesInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: player1});
        
        let emittedEvents = await eventWatcher.get();
        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Dana", {from: player2});
        
        // now the player 2 will win, and the game will end
        await gamesInstance.confirmGame(gameIdx, 124, "initial salt", {from: player1});
        
        emittedEvents = await endingWatcher.get();
        assert.equal(emittedEvents.length, 2, "GameEnded should have 2 events");
        assert.isOk(emittedEvents[0].args.opponent, "Opponent should be an address");
        assert(emittedEvents[0].args.opponent == player1 || emittedEvents[0].args.opponent == player2, "The opponent should be among the players");
        assert(emittedEvents[1].args.opponent == player1 || emittedEvents[1].args.opponent == player2, "The opponent should be among the players");

        try {
            await gamesInstance.acceptGame(gameIdx, 150, "Jack", {from: randomUser});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });

    it("should remove the game from the list of available games when accepted", async function(){
        const eventWatcher = gamesInstance.GameCreated();

        let gamesIdx1 = await gamesInstance.getOpenGames.call();
        gamesIdx1 = gamesIdx1.map(n => n.toNumber());

        let hash = await gamesInstance.saltedHash.call(123, "my salt 1");
        await gamesInstance.createGame(hash, "Jim");

        let emittedEvents = await eventWatcher.get();
        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();

        let gamesIdx2 = await gamesInstance.getOpenGames.call();
        gamesIdx2 = gamesIdx2.map(n => n.toNumber());
        
        await gamesInstance.acceptGame(gameIdx, 0, "Dana", { from: player2 });
        
        let gamesIdx3 = await gamesInstance.getOpenGames.call();
        gamesIdx3 = gamesIdx3.map(n => n.toNumber());
        
        assert.notInclude(gamesIdx1, gameIdx, "Should not include the new game yet");
        assert.include(gamesIdx2, gameIdx, "Should include the new game");
        assert.notInclude(gamesIdx3, gameIdx, "Should not include the new game anymore");
    });

    // Bet.confirmGame

    it("should reject confirming a non existing game", async function () {
        try {
            await gamesInstance.confirmGame(12345687, 100, "some salt");
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        try {
            await gamesInstance.confirmGame(23456789, 200, "some more salt");
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });

    it("should reject confirming a game that has not been accepted yet", async function () {
        const eventWatcher = gamesInstance.GameCreated();

        let hash = await gamesInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: player1});

        const emittedEvents = await eventWatcher.get();
        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();

        try {
            await gamesInstance.confirmGame(gameIdx, 123, "some salt");
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        try {
            await gamesInstance.confirmGame(gameIdx, 200, "some more salt");
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });

    it("should give the game for the second user if the hash does not match with the revealed values", async function () {
        const eventWatcher = gamesInstance.GameCreated();

        let hash = await gamesInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: player1});

        const emittedEvents = await eventWatcher.get();
        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();

        await gamesInstance.acceptGame(gameIdx, 234, "Dana", {from: player2});
        
        await gamesInstance.confirmGame(gameIdx, 124, "initial salt", {from: player1});
        
        // 123 != 124 => player 2 should be the winner
        let [status] = await gamesInstance.getGameInfo(gameIdx);
        assert.equal(status.toNumber(), 12, "Player 2 should be the winner");
    });

    it("should confirm a valid game for player 1", async function () {
        const creationWatcher = gamesInstance.GameCreated();
        const startingWatcher = gamesInstance.GameStarted();

        let hash = await gamesInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: player1});

        const creationEvents = await creationWatcher.get();
        let gameIdx = creationEvents[0].args.gameIdx.toNumber();

        await gamesInstance.acceptGame(gameIdx, 200, "Dana", {from: player2});

        let lastTransactionpre = await gamesInstance.getGameTimestamp(gameIdx);
        assert.isAbove(lastTransactionpre.toNumber(), 0, "The last timestamp should be set");

        await new Promise(resolve => setTimeout(resolve, 1000));
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: player1});
        
        const startingEvents = await startingWatcher.get();
        gameIdx = startingEvents[0].args.gameIdx.toNumber();

        assert.isOk(startingEvents, "Events should be an array");
        assert.equal(startingEvents.length, 1, "There should be one started game event");
        assert.isOk(startingEvents[0], "There should be one started game event");
        assert.equal(startingEvents[0].args.gameIdx.toNumber(), gameIdx, "The game should have the last gameIdx");
        assert.equal(startingEvents[0].args.opponent, player2, "The opponent should be player 2");

        // 100 ^ 200 is even => player 1 should start
        let [status, amount, nick1, nick2, ...rest] = await gamesInstance.getGameInfo(gameIdx);
        assert.equal(status.toNumber(), 1, "Player 1 should be able to start");

        assert.equal(amount.comparedTo(0), 0, "The game should have 0 ether");
        assert.equal(nick1, "Jim", "The player 1 should be Jim");
        assert.equal(nick2, "Dana", "The player 2 should be Dana");
        assert.deepEqual(rest, [], "The response should have 5 elements");

        let lastTransactionpost;
        lastTransactionpost = await gamesInstance.getGameTimestamp(gameIdx);
        assert.isAbove(lastTransactionpost.toNumber(), lastTransactionpre.toNumber(), "The last timestamp should be newer");

        const [p1, p2, ...rest3] = await gamesInstance.getGamePlayers(gameIdx);
        assert.equal(p1, player1, "The address of player 1 should still be set");
        assert.equal(p2, player2, "The address of player 2 should still be set");
        assert.deepEqual(rest3, [], "The response should have 2 elements");
    });
    
    it("should confirm a valid game for player 2", async function () {
        const creationWatcher = gamesInstance.GameCreated();
        const startingWatcher = gamesInstance.GameStarted();

        let hash = await gamesInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: player1});

        const creationEvents = await creationWatcher.get();
        let gameIdx = creationEvents[0].args.gameIdx.toNumber();

        await gamesInstance.acceptGame(gameIdx, 200, "Dana", {from: player2});

        let lastTransactionpre = await gamesInstance.getGameTimestamp(gameIdx);
        assert.isAbove(lastTransactionpre.toNumber(), 0, "The last timestamp should be set");

        await new Promise(resolve => setTimeout(resolve, 1000));
        await gamesInstance.confirmGame(gameIdx, 123, "initial salt", {from: player1});
        
        const startingEvents = await startingWatcher.get();
        gameIdx = startingEvents[0].args.gameIdx.toNumber();

        assert.isOk(startingEvents, "Events should be an array");
        assert.equal(startingEvents.length, 1, "There should be one started game event");
        assert.isOk(startingEvents[0], "There should be one started game event");
        assert.equal(startingEvents[0].args.gameIdx.toNumber(), gameIdx, "The game should have the last gameIdx");
        assert.equal(startingEvents[0].args.opponent, player2, "The opponent should be player 2");

        // 123 ^ 200 is odd => player 2 should start
        let [status, amount, nick1, nick2, ...rest] = await gamesInstance.getGameInfo(gameIdx);
        assert.equal(status.toNumber(), 2, "Player 2 should be able to start");

        assert.equal(amount.comparedTo(0), 0, "The game should have 0 ether");
        assert.equal(nick1, "Jim", "The player 1 should be Jim");
        assert.equal(nick2, "Dana", "The player 2 should be Dana");
        assert.deepEqual(rest, [], "The response should have 5 elements");

        let lastTransactionpost = await gamesInstance.getGameTimestamp(gameIdx);
        assert.isAbove(lastTransactionpost.toNumber(), lastTransactionpre.toNumber(), "The last timestamp should be newer");

        const [p1, p2, ...rest3] = await gamesInstance.getGamePlayers(gameIdx);
        assert.equal(p1, player1, "The address of player 1 should still be set");
        assert.equal(p2, player2, "The address of player 2 should still be set");
        assert.deepEqual(rest3, [], "The response should have 2 elements");
    });
    
    it("should reject confirming a game if it is already started", async function () {
        const eventWatcher = gamesInstance.GameCreated();

        let hash = await gamesInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: player1});

        const emittedEvents = await eventWatcher.get();
        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();

        await gamesInstance.acceptGame(gameIdx, 200, "Dana", {from: player2});
        await gamesInstance.confirmGame(gameIdx, 123, "initial salt", {from: player1});
        
        try {
            await gamesInstance.confirmGame(gameIdx, 123, "initial salt", {from: player1});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should have been reverted. Instead, the error was: " + err.message);
        }
    });

    it("should reject confirming a game if it has already ended", async function () {
        const eventWatcher = gamesInstance.GameCreated();
        
        let hash = await gamesInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: player1});
        
        const emittedEvents = await eventWatcher.get();
        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        await gamesInstance.acceptGame(gameIdx, 234, "Dana", {from: player2});
        
        // now the player 2 will win, and the game will end
        await gamesInstance.confirmGame(gameIdx, 124, "initial salt", {from: player1});
        
        try {
            await gamesInstance.confirmGame(gameIdx, 123, "initial salt", {from: player1});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });

    it("should reject game confirmations from users other than the creator", async function () {
        const eventWatcher = gamesInstance.GameCreated();

        let hash = await gamesInstance.saltedHash.call(123, "initial salt");
        await gamesInstance.createGame(hash, "Jim", {from: player1});

        const emittedEvents = await eventWatcher.get();
        const gameIdx = emittedEvents[0].args.gameIdx.toNumber();

        await gamesInstance.acceptGame(gameIdx, 200, "Dana", {from: player2});
        
        try {
            await gamesInstance.confirmGame(gameIdx, 123, "initial salt", {from: randomUser});
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });


    // Bet.withdraw

    it("should reject withdrawals from a non existing game", async function () {

        try {
            await gamesInstance.withdraw(55555, { from: player1 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
        try {
            await gamesInstance.withdraw(55555, { from: player2 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });

    it("should reject withdrawals from an unstarted game within the timeout period", async function () {
        const eventWatcher = gamesInstance.GameCreated();
        
        let hash = await gamesInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", { from: player1, value: web3.toWei(0.01, "ether") });
        
        let emittedEvents = await eventWatcher.get();
        let gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        try {
            await gamesInstance.withdraw(gameIdx, { from: player1 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
        try {
            await gamesInstance.withdraw(gameIdx, { from: player2 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        await gamesInstance.acceptGame(gameIdx, 234, "Jane", { from: player2, value: web3.toWei(0.01, "ether") });
        
        // before the timeout

        try {
            await gamesInstance.withdraw(gameIdx, { from: player1 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
        try {
            await gamesInstance.withdraw(gameIdx, { from: player2 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });


    it("should reject withdrawals from an active game and recent transactions", async function () {
        const eventWatcher = gamesInstance.GameCreated();
        
        // Create
        let hash = await gamesInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", { from: player1, value: web3.toWei(0.01, "ether") });
        
        let emittedEvents = await eventWatcher.get();
        let gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        // Start
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", { from: player2, value: web3.toWei(0.01, "ether") });
        
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: player1});

        try {
            await gamesInstance.withdraw(gameIdx, { from: player1 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
        try {
            await gamesInstance.withdraw(gameIdx, { from: player2 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });
    

    
    it("should accept the withdrawal from the game winner", async function () {
        const eventWatcher = gamesInstance.GameCreated();
        
        // Create
        let hash = await gamesInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", { from: player1, value: web3.toWei(0.01, "ether") });
        
        let emittedEvents = await eventWatcher.get();
        let gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        // Start
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", { from: player2, value: web3.toWei(0.01, "ether") });
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: player1});

        try {
            await gamesInstance.withdraw(gameIdx, { from: player1 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
        try {
            await gamesInstance.withdraw(gameIdx, { from: player2 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
        
        // Player 1 wins

        await gamesInstance.electWinner(gameIdx);

        const balance1pre = await web3.eth.getBalance(player1);
        const tx1 = await gamesInstance.withdraw(gameIdx, { from: player1 });
        const balance1post = await web3.eth.getBalance(player1);

        // player 1 balance
        let expected = balance1pre.plus(web3.toWei(0.02, "ether"));
        expected = expected.minus(web3.toBigNumber(tx1.receipt.gasUsed).times(testingGasPrice));

        assert(balance1post.eq(expected), "Player 1's balance should have increased by 0.02 ether minus gas");
    });
    
    it("should accept the withdrawal of player 2 if the creator does not confirm", async function () {
        const eventWatcher = gamesInstance.GameCreated();
        
        // Create
        let hash = await gamesInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", { from: player1, value: web3.toWei(0.01, "ether") });
        
        let emittedEvents = await eventWatcher.get();
        let gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        // Start
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", { from: player2, value: web3.toWei(0.01, "ether") });
        
        let [status] = await gamesInstance.getGameInfo(gameIdx);
        assert.equal(status.toNumber(), 0, "The game should be accepted but not started");

        try {
            await gamesInstance.withdraw(gameIdx, { from: player2 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Player 2 claims

        const balance2pre = await web3.eth.getBalance(player2);

        const tx2 = await gamesInstance.withdraw(gameIdx, { from: player2 });

        [status] = await gamesInstance.getGameInfo(gameIdx);
        assert.equal(status.toNumber(), 12, "The game should be for player 2");

        const balance2post = await web3.eth.getBalance(player2);

        // player 2 balance
        let expected = balance2pre.plus(web3.toWei(0.02, "ether"));
        expected = expected.minus(web3.toBigNumber(tx2.receipt.gasUsed).times(testingGasPrice));

        assert(balance2post.eq(expected), "Player 2's balance should have increased by 0.02 ether minus gas");
    });
    
    it("should reject withdrawals from the game loser", async function () {
        const eventWatcher = gamesInstance.GameCreated();
        
        // Create
        let hash = await gamesInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", { from: player1, value: web3.toWei(0.01, "ether") });
        
        let emittedEvents = await eventWatcher.get();
        let gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        // Start
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", { from: player2, value: web3.toWei(0.01, "ether") });
        
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: player1});

        try {
            await gamesInstance.withdraw(gameIdx, { from: player1 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
        try {
            await gamesInstance.withdraw(gameIdx, { from: player2 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
        
        // Player 1 wins

        await gamesInstance.electWinner(gameIdx);

        const balance2pre = await web3.eth.getBalance(player2);

        try {
            await gamesInstance.withdraw(gameIdx, { from: player2 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        const balance2post = await web3.eth.getBalance(player2);

        // player 2 balance
        assert(balance2post.lt(balance2pre), "Player 2's balance should have decreased (gas)");
    });
    
    it("should reject withdrawals from a game with no money", async function () {
        const eventWatcher = gamesInstance.GameCreated();
        
        // Create
        let hash = await gamesInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", { from: player1 });
        
        let emittedEvents = await eventWatcher.get();
        let gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        // Start
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", { from: player2 });
        
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: player1});

        try {
            await gamesInstance.withdraw(gameIdx, { from: player1 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
        try {
            await gamesInstance.withdraw(gameIdx, { from: player2 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
        
        // Player 1 wins

        await gamesInstance.electWinner(gameIdx);

        const balance1pre = await web3.eth.getBalance(player1);
        const balance2pre = await web3.eth.getBalance(player2);

        try {
            await gamesInstance.withdraw(gameIdx, { from: player1 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        try {
            await gamesInstance.withdraw(gameIdx, { from: player2 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        const balance1post = await web3.eth.getBalance(player1);
        const balance2post = await web3.eth.getBalance(player2);

        // players balance
        assert(balance1post.lt(balance1pre), "Player 1's balance should have decreased (gas)");
        assert(balance2post.lt(balance2pre), "Player 2's balance should have decreased (gas)");
    });
    
    it("should reject withdrawals from an extraneous user", async function () {
        const eventWatcher = gamesInstance.GameCreated();
        
        // Create
        let hash = await gamesInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", { from: player1, value: web3.toWei(0.01, "ether") });
        
        let emittedEvents = await eventWatcher.get();
        let gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        // Start
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", { from: player2, value: web3.toWei(0.01, "ether") });
        
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: player1});

        try {
            await gamesInstance.withdraw(gameIdx, { from: randomUser });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
        
        // Player 1 wins the following game

        await gamesInstance.electWinner(gameIdx);

        try {
            await gamesInstance.withdraw(gameIdx, { from: randomUser });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
        
    });
    
    it("should accept only one legitimate withdrawal and reject the rest", async function () {
        const creationWatcher = gamesInstance.GameCreated();
        const endingWatcher = gamesInstance.GameEnded();
        
        // Create
        let hash = await gamesInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", { from: player1, value: web3.toWei(0.01, "ether") });
        
        let emittedEvents = await creationWatcher.get();
        let gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        // Start
        await gamesInstance.acceptGame(gameIdx, 234, "Jane", { from: player2, value: web3.toWei(0.01, "ether") });
        
        await gamesInstance.confirmGame(gameIdx, 100, "initial salt", {from: player1});

        // Player 1 wins

        await gamesInstance.electWinner(gameIdx);

        emittedEvents = await endingWatcher.get();
        assert.equal(emittedEvents.length, 2, "GameEnded should have 2 events");
        assert.isOk(emittedEvents[0].args.opponent, "Opponent should be an address");
        assert(emittedEvents[0].args.opponent == player1 || emittedEvents[0].args.opponent == player2, "The opponent should be among the players");
        assert(emittedEvents[1].args.opponent == player1 || emittedEvents[1].args.opponent == player2, "The opponent should be among the players");

        const balance1pre = await web3.eth.getBalance(player1);

        const tx1 = await gamesInstance.withdraw(gameIdx, { from: player1 });

        const balance1post = await web3.eth.getBalance(player1);

        // player 1 balance
        let expected = balance1pre.plus(web3.toWei(0.02, "ether"));
        expected = expected.minus(web3.toBigNumber(tx1.receipt.gasUsed).times(testingGasPrice));

        assert(balance1post.eq(expected), "Player 1's balance should have increased by 0.02 ether minus gas");

        // retry many times
        try {
            await gamesInstance.withdraw(gameIdx, { from: player1 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
        
        try {
            await gamesInstance.withdraw(gameIdx, { from: player1 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
        
        try {
            await gamesInstance.withdraw(gameIdx, { from: player1 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }
    });
    
    it("should allow the creator to withdraw and end if nobody accepts the game after a while", async function () {
        const eventWatcher = gamesInstance.GameCreated();
        
        // Create
        let hash = await gamesInstance.saltedHash.call(100, "initial salt");
        await gamesInstance.createGame(hash, "James", { from: player1, value: web3.toWei(0.01, "ether") });
        
        let emittedEvents = await eventWatcher.get();
        let gameIdx = emittedEvents[0].args.gameIdx.toNumber();
        
        let gamesIdx = await gamesInstance.getOpenGames.call();
        gamesIdx = gamesIdx.map(n => n.toNumber());
        assert.include(gamesIdx, gameIdx, "Should include the new game");

        // try to withdraw earlier than it should be

        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
            await gamesInstance.withdraw(gameIdx, { from: player1 });
            assert.fail("The transaction should have thrown an error");
        }
        catch (err) {
            assert.include(err.message, "revert", "The transaction should be reverted");
        }

        gamesIdx = await gamesInstance.getOpenGames.call();
        gamesIdx = gamesIdx.map(n => n.toNumber());
        assert.include(gamesIdx, gameIdx, "Should still include the game");

        // nobody accepts
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        let [status] = await gamesInstance.getGameInfo(gameIdx);
        assert.equal(status.toNumber(), 0, "The game should still be not started");

        // cancel the game
        const balance1pre = await web3.eth.getBalance(player1);
        const tx1 = await gamesInstance.withdraw(gameIdx, { from: player1 });
        const balance1post = await web3.eth.getBalance(player1);

        // player 1 balance
        let expected = balance1pre.plus(web3.toWei(0.01, "ether"));
        expected = expected.minus(web3.toBigNumber(tx1.receipt.gasUsed).times(testingGasPrice));

        assert(balance1post.eq(expected), "The creator's balance should have increased by 0.01 ether minus gas");

        [status] = await gamesInstance.getGameInfo(gameIdx);
        assert.equal(status.toNumber(), 10, "The game should be ended");

        gamesIdx = await gamesInstance.getOpenGames.call();
        gamesIdx = gamesIdx.map(n => n.toNumber());
        assert.notInclude(gamesIdx, gameIdx, "Should not include the game anymore");
    });

});
