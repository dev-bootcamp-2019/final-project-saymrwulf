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

    const BetAbi = fs.readFileSync(path.resolve(__dirname, "..", "build", "__contracts_Bet_sol_Bet.abi")).toString()
    const BetBytecode = fs.readFileSync(path.resolve(__dirname, "..", "build", "__contracts_Bet_sol_Bet.bin")).toString()
    const LibraryDemoAbi = fs.readFileSync(path.resolve(__dirname, "..", "build", "__contracts_LibraryDemo_sol_LibraryDemo.abi")).toString()
    const LibraryDemoBytecode = fs.readFileSync(path.resolve(__dirname, "..", "build", "__contracts_LibraryDemo_sol_LibraryDemo.bin")).toString()

    try {
        console.log("Deploying LibraryDemo ...")
        const LibraryDemoAddress = await deploy(web3, accounts[0], LibraryDemoAbi, LibraryDemoBytecode)
        console.log(`- LibraryDemo deployed at ${LibraryDemoAddress}\n`)

        const libPattern = /__.\/contracts\/LibraryDemo.sol:LibraryD__/g
        const linkedBetBytecode = BetBytecode.replace(libPattern, LibraryDemoAddress.substr(2))
        if (linkedBetBytecode.length != BetBytecode.length) {
            throw new Error("The linked contract size does not match the original")
        }
        
        console.log("Deploying Bet...")
        const BetAddress = await deploy(web3, accounts[0], BetAbi, linkedBetBytecode, 0)
        console.log(`- Bet deployed at ${BetAddress}`)
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
