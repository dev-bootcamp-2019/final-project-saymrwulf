const fs = require("fs")
const path = require("path")
const Web3 = require("web3")

const web3 = new Web3("http://localhost:8545")

async function deploy(web3, fromAccount, ABI, bytecode, ...params) {
    const contract = new web3.eth.Contract(JSON.parse(ABI))

    const estimatedGas = await contract.deploy({ data: "0x" + bytecode, arguments: params }).estimateGas()

    const tx = await contract
        .deploy({ data: "0x" + bytecode, arguments: params })
        .send({ from: fromAccount, gas: estimatedGas + 200 })

    return tx.options.address
}

function setContractAddressToEnv(contractAddress) {
    if (!contractAddress) throw new Error("Invalid contract address")
    const filePath = path.resolve(__dirname, "..", ".env.test.local")
    let data = fs.readFileSync(filePath).toString()

    data = data.replace(/CONTRACT_ADDRESS=[^\n]+/, `CONTRACT_ADDRESS=${contractAddress}`)
    fs.writeFileSync(filePath, data)
}

async function deployContracts() {
    const accounts = await web3.eth.getAccounts()

    console.log(`The account used to deploy is ${accounts[0]}`)

    const betContractAbi = fs.readFileSync(path.resolve(__dirname, "..", "..", "onchain", "build", "__contracts_Bet_sol_Bet.abi")).toString()
    const betContractBytecode = fs.readFileSync(path.resolve(__dirname, "..", "..", "onchain", "build", "__contracts_Bet_sol_Bet.bin")).toString()
    const libraryDemoAbi = fs.readFileSync(path.resolve(__dirname, "..", "..", "onchain", "build", "__contracts_LibraryDemo_sol_LibraryDemo.abi")).toString()
    const libraryDemoBytecode = fs.readFileSync(path.resolve(__dirname, "..", "..", "onchain", "build", "__contracts_LibraryDemo_sol_LibraryDemo.bin")).toString()

    try {

        console.log("Deploying LibraryDemo ...")
        const libraryDemoAddress = await deploy(web3, accounts[0], libraryDemoAbi, libraryDemoBytecode)
        console.log(`- LibraryDemo deployed at ${libraryDemoAddress}\n`)

        const libPattern = /__.\/contracts\/LibraryDemo.sol:LibraryD__/g
        const linkedBetBytecode = betContractBytecode.replace(libPattern, libraryDemoAddress.substr(2))
        if (linkedBetBytecode.length != betContractBytecode.length) {
            throw new Error("The linked contract size does not match the original")
        }

        console.log("Deploying BetContract...")
        const betContractAddress = await deploy(web3, accounts[0], betContractAbi, linkedBetBytecode, 0)
        console.log(`- BetContract deployed at ${betContractAddress}`)
        
        // write .env.test.local
        setContractAddressToEnv(betContractAddress)
    }
    catch (err) {
        console.error("\nUnable to deploy:", err.message, "\n")
        process.exit(1)
    }
    process.exit()
}

deployContracts()
