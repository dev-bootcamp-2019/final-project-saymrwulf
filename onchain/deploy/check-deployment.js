const fs = require("fs")
const path = require("path")
const Web3 = require("web3")
const HDWalletProvider = require("truffle-hdwallet-provider")

const { PROVIDER_URI, WALLET_MNEMONIC } = require("../env.json")
const provider = new HDWalletProvider(WALLET_MNEMONIC, PROVIDER_URI)
const web3 = new Web3(provider)

async function startGame() {
    const accounts = await web3.eth.getAccounts()

    const BetAbi = fs.readFileSync(path.resolve(__dirname, "..", "build", "__contracts_Bet_sol_Bet.abi")).toString()

    try {
        const BetInstance = new web3.eth.Contract(JSON.parse(BetAbi), "0x77718aE07319464E14Dc9071F0D6ce81A56aa52C")

        const hash = await BetInstance.methods.saltedHash(100, "initial salt").call()
        const tx = await BetInstance.methods.createGame(hash, "Ole").send({ from: accounts[0], value: web3.utils.toWei("0.001", "ether") })
        const gameIdx = tx.events.GameCreated.returnValues.gameIdx
        console.log("GAME CREATED", gameIdx)
        console.log(await BetInstance.methods.getGameInfo(gameIdx).call())
    }
    catch (err) {
        console.error("\nUnable to deploy:", err.message, "\n")
        process.exit(1)
    }
    process.exit()

}

startGame()
