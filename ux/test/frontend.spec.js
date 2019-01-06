const { expect } = require("chai")
const puppeteer = require("puppeteer")
const dappeteer = require("dappeteer")
const fs = require('fs')
const path = require('path')
const Web3 = require("web3")
const HDWalletProvider = require("truffle-hdwallet-provider")

var browser, metamask, web3
var player2
var Bet
const DAPP_URL = "http://localhost:1234"
const DEFAULT_METAMASK_OPTIONS = { gasLimit: 6654755 }

describe("Bet UX", async function () {

    before(async function () {
        this.timeout(1000 * 35)

        // Browser init
        browser = await dappeteer.launch(puppeteer)
        metamask = await dappeteer.getMetamask(browser)

        // import MetaMask account, same as ganache
        const mnemonic = fs.readFileSync(path.resolve(__dirname, "..", "dev", "mnemonic.txt")).toString()
        await metamask.importAccount(mnemonic)
        await metamask.switchNetwork('localhost 8545') // ganache

        // Local init
        let provider = new HDWalletProvider(mnemonic, "http://localhost:8545", 0)
        player1 = provider.addresses[0]
        provider = new HDWalletProvider(mnemonic, "http://localhost:8545", 1)
        player2 = provider.addresses[0]
        web3 = new Web3(provider)

        const testEnv = fs.readFileSync(path.resolve(__dirname, "..", ".env.test.local")).toString()
        const address = testEnv.match(/CONTRACT_ADDRESS=([^\n]+)/)[1]

        const betAbi = fs.readFileSync(path.resolve(__dirname, "..", "src", "contracts", "bet.json")).toString()
        Bet = new web3.eth.Contract(JSON.parse(betAbi), address)
    })

    // CLEAN UP

    after(() => {
        if (web3 && web3.currentProvider) {
            if (web3.currentProvider.disconnect) {
                web3.currentProvider.disconnect()
            }
            else if (web3.currentProvider.connection) {
                web3.currentProvider.connection.close()
            }
        }

        if (browser) {
            return browser.close()
        }
    })


    it("should create and play a game and ... win - and collect the stash", async function () {
        this.timeout(1000 * 60)

        // open localhost
        const page = await browser.newPage()
        await page.goto(DAPP_URL)

        // The game list should be empty
        await page.waitForSelector('#main #list')
        let handle = await page.$$('#list > *')
        expect(handle.length).to.equal(1)

        handle = await page.$('#list')
        expect(await handle.$eval('p', node => node.innerText)).to.equal("There are no open games at the moment. You can create one!")

        // CREATE A GAME

        await page.type('input[name="nick"]', "Jack")
        await page.type('input[name="number"]', "234")
        await page.type('input[name="salt"]', "My salt here")
        await page.type('input[name="value"]', "1")

        await page.click('#start')
        await delay(200)
        await metamask.confirmTransaction(DEFAULT_METAMASK_OPTIONS)

        // wait for tx
        await page.bringToFront()
        await page.waitFor(
            () => document.querySelector('#start') == null,
            { timeout: 30 * 1000 }
        )

        await page.waitForSelector('#game')
        await delay(1000)

        // NOTIFICATION

        await page.waitForSelector('.ant-notification-notice-with-icon')
        handle = await page.$('.ant-notification-notice-with-icon')
        expect(await handle.$eval('.ant-notification-notice-description', node => node.innerText)).to.equal("Your game has been created. Waiting for another user to accept it.")

        // ACCEPT THE GAME (player 2)

        let hash = await page.evaluate(() => {
            return document.location.hash
        })
        expect(hash).to.match(/^#\/games\/[0-9]+$/)
        let gameIdx = hash.match(/#\/games\/([0-9]+)/)
        gameIdx = gameIdx[1]
        expect(gameIdx).to.equal("0")

        let tx = await Bet.methods.acceptGame(Number(gameIdx), 78, "James").send({ from: player2, value: web3.utils.toWei("1", "ether") })
        expect(tx.events.GameAccepted.returnValues.gameIdx).to.equal(gameIdx)

        // NOTIFICATION

        await delay(2000)

        await page.waitForSelector('.ant-notification-notice-with-icon')
        handle = await page.$$('.ant-notification-notice-with-icon')
        let value = await handle[1].$eval(".ant-notification-notice-description", node => node.innerText)
        expect(value).to.equal("James has accepted the game!")

        // SHOULD BE CONFIRMING THE GAME

        await delay(1500)

        await page.waitForSelector('#game .loading-spinner')
        value = await page.$eval("#game .loading-spinner", node => node.innerText)
        expect(value).to.equal("Waiting ")

        await delay(200)
        await metamask.confirmTransaction(DEFAULT_METAMASK_OPTIONS)

        // wait for tx
        await page.bringToFront()
        await delay(1000)

        // SHOULD BE CONFIRMED

        await page.waitForSelector('.ant-notification-notice-description')
        value = await page.$eval(".ant-notification-notice-description", node => node.innerText)
        expect(value).to.equal("The game is on. Good luck!")

        await page.waitForSelector('#status')
        value = await page.$eval("#status", node => node.innerText)
        expect(value).to.equal("It's your turn")

        value = await page.$eval("#timer", node => node.innerText)
        expect(value).to.match(/Remaining time: [0-9]+ minutes before James can claim the game/)

        value = await page.$eval("#bet", node => node.innerText)
        expect(value).to.equal("Game bet: 1 Ξ")

        tx = await Bet.methods.electWinner(Number(gameIdx)).send({ from: player2 })
        await delay(1500)

        await page.waitForSelector('#withdraw')
        value = await page.$eval("#withdraw", node => node.innerText)
        expect(value).to.equal("Withdraw1Ξ")

        // WITHDRAW 

        await page.click("#withdraw")
        await delay(200)
        await metamask.confirmTransaction(DEFAULT_METAMASK_OPTIONS)

        await page.bringToFront()
        await delay(3000)

        await page.waitForSelector('.ant-notification-notice-description')
        value = await page.$eval(".ant-notification-notice-description", node => node.innerText)
        expect(value).to.equal("The money has been withdrawn")
        
        await delay(200)
        await page.waitFor(
            () => document.querySelector('#withdraw') == null,
            { timeout: 1000 * 30}
        )

        // GO BACK

        await page.click("#back")
        await delay(200)

        hash = await page.evaluate(() => {
            return document.location.hash
        })
        expect(hash).to.equal("#/")

        await page.close()
    })


})

const delay = async interval => new Promise(resolve => setTimeout(resolve, interval))

