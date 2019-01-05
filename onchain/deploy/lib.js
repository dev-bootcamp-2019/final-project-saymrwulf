const fs = require("fs")
const path = require("path")
const Web3 = require("web3")
const HDWalletProvider = require("truffle-hdwallet-provider")

const { PROVIDER_URI, WALLET_MNEMONIC } = require("../env.json")
const provider = new HDWalletProvider(WALLET_MNEMONIC, PROVIDER_URI)
const web3 = new Web3(provider)

async function deploy(web3, fromAccount, ABI, bytecode, ...params) {
    const contract = new web3.eth.Contract(JSON.parse(ABI))

    const estimatedGas = await contract.deploy({ data: "0x" + bytecode, arguments: params }).estimateGas()

    const tx = await contract
        .deploy({ data: "0x" + bytecode, arguments: params })
        .send({ from: fromAccount, gas: estimatedGas + 200 })

    return tx.options.address
}

async function deployDapp() {
    const accounts = await web3.eth.getAccounts()

    console.log(`The account used to deploy is ${accounts[0]}`)
    console.log("Current balance: ", await web3.eth.getBalance(accounts[0]), "\n")

    const BetAbi = fs.readFileSync(path.resolve(__dirname, "..", "build", "Bet_sol_Bet.abi")).toString()
    const BetBytecode = fs.readFileSync(path.resolve(__dirname, "..", "build", "Bet_sol_Bet.bin")).toString()

    try {
        console.log("Deploying Bet Contract...")
        const BetAddress = await deploy(web3, accounts[0], BetAbi, BetBytecode, 0)
        console.log(`- Bet Contract deployed at ${BetAddress}`)
    }
    catch (err) {
        console.error("\nUnable to deploy:", err.message, "\n")
        process.exit(1)
    }
    process.exit()
}

module.exports = {
    deployDapp
}
