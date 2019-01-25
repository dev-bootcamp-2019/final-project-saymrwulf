Bet
---
The main use case of bet is to initiate bets between 2 arbitrary players. The initiator/challenger (Alice) places a bet on a list of open bets. The responder (Bob) accepts a bet from this list. Alice can put Ethers on particulary bets and Bob has to counter with the same ammount accordingly. Whoever wins the bet, wins the sum of Alice's and Bob's money, and can withdraw it from the contract. The nature of the bet is not of importance as the contract acts as a placeholder and enabler for sophisticated bets that could rely on trustworthy oracles or sophisticated cryptographic constructions (Verifiable Random Functions, Verifyable Delay Functions, zero knowledge proofs and the like); verious sorts of games could be implemented on top of this framework. In our case the bet is simple: Alice places with her bet a very simple commitment (a hash) of a random number + ephemeral salt. Bob counters with a random number and an epheremal salt. Alice confirms Bob's counter by revealing his random number + salt. (If Alice does not confirm, Bob wins by default.) The contract decides upon who wins and who loses by simply checking, that a) Alice has not cheated by sending the wrong random number (Does the commitment hold ?), and b) is `Alice-RND XOR Bob-RND` even or odd. (even: Alice wins; odd: Bob wins). This is called a commit-reveal schmema and has the nice property that winner election is not based on a trusted entity (like a bank) or deterministic randomness that could be predicted by, lets say, miners. The downside, of course, is, that you always need a peer counterparty. Also, one has to consider the back and forth being an overhead, especially if one extends the confirm-reveal to the other player as well, what we ommitted for sake of simplicity. (More on this in the `attacks and countermeasures` section.)

The project consists of 2 subprojects: 1) An Ethereum part (```onchain```)with the bet sontract and a librarydemo contract mockup (for demonstrating usage of such libs). 2) And a React/Redux webapp part (```ux```) that runs locally and uses either Ropsten or Ganache as a backend.

To get a quick impression about the game, have a look at ConsenSys_Finalexam.mov . The short video contains a screencapture of the end-to-end test. 
---

## Prep
### Global Dependencies
Here is what we need:
* node, npm, yarn, git
* runner-cli (a simple task runner)
* Parcel (a JS bundler)
* Truffle (< 5.x), Solc, Ganache
* project repo clone

This is how we do it (We assume some preinstalled software from former exercises):
```
node --version
      v11.0.0
npm --version
      6.4.1
yarn --version    (We need yarn because of difficulties installing Parcel with npm.)
      1.9.4
truffle version
      Truffle v4.1.15 (core: 4.1.15)
      Solidity v0.4.25 (solc-js)
ganache-cli --version
      Ganache CLI v6.2.5 (ganache-core: 2.3.3)
npm install -g runner-cli
yarn global add parcel-bundler
git clone https://github.com/dev-bootcamp-2019/final-project-saymrwulf.git
```
There are two places in the project we just cloned, where readers should put their own 12 word Ethereum mnemonics in right now.(see remarks about this topic in chapter Remarks, subchapter UX Subproject). 
The first place is ```onchain/env.json```, the second one is ```ux/dev/mnemonics.txt```.

### Local Dependencies   
#### Onchain Subproject
```
cd onchain
run init  (= this is actually a `cd ./deploy && npm install`)
run build   (= contracts folder's sol file compile with solcjs)
run test     (= local `truffle test`)
run deploy   (= `node deploy` of libraryDemo contract and bet contract to Ropsten)
         The account used to deploy is 0x...
         LibraryDemo deployed at 0x...
         Bet deployed at 0x...
vi ./deploy/check-deployment.js    (= You have to insert the bet contract address from above.)
node ./deploy/check-deployment.js    (= mini check on Ropsten deployment success)
```
#### UX Subproject
```
cd ux
npm install
vi .env   (= insert bet contract address from onchain subproject Ropsten deploy from above)
cd src/contracts
ln -s ../../../onchain/build/__contracts_Bet_sol_Bet.abi ./bet.json   (= we need access to the ABI here)
cd ../..
run dev ropsten    (= local webapp running with bet contract deployed at Ropsten backend - switch Metamask to Ropsten !)
run dev   (= local webapp running with local ganache; for manual End2End test; needs Chrome/Firefox+Metamask - switch Metamask to private network !)
run test  (= local webapp running with local ganache; automatic End2End test with Chromium/puppeteer/dappeteer)
```
---

## Remarks
### Onchain Subproject
A ```truffle compile && truffle migrate``` is not necessary as we stay with plain ```solcjs``` as seen in onchain's taskfile build step and with ```node deploy``` as seen in taskfile's deploy step (by using `env.json`). We use Truffle for local tests as can be seen in the taskfile's test step, thereby making use of Mocha testing framework for the JS based tests. Speaking of tests: the solidity based tests and the JS based tests in the tests folder are selfexplanatory and cover mainly cases of state management of edge cases of bets. The bet contract (and the LibraryDemo contract) are pretty simple: just a few functions for game creation (by the challenger), game acceptance (by the responder), game confirmation (by the challenger), winner election and money withdrawal (by the winner). Some fitting events complement this to allow a DApp use this contract in a responsive manner.

The usefulness of solidity testing code is somewhat limited, as it is not possible to inject function calls from different users (which we need for simulating interactions in a game). Therefor the focus is on Mocha's assertions as can be seen when running the full test suite (```run test```).

Besides the functions that reflect bet actions, the bet contract has a simple data structure to manage a game's state; also it uses an iterable list of open games to chose from.

If a user visits the webapp, he can either create a new game that is then added to this list of open games or he can chose one of the open, not yet accepted (by other users), games on the list. As there is not much variation in game unfolding , the only driving force besides who the counterparty might be, is, how much money is at stake. In case of game creation, the user choses a nickname, the ammount he is willing to bet, and his random number plus (hopefully random)salt. Of course, not the contract but the webapp is responsible to place a commitment (here, a hash) of this data pair at the contract's create function. In case of a user deciding not to create a new game but to accept an open, not confirmed (started) one, he sends his random number plus salt to the contract's accept function. And we need a third function, confirm, used by the initiator, in order to send his random number plus salt. Hopefully a data pair that fits his initial commitment - or he is the cheater-looser immediately. The fourth function just decides upon the winning party and opens the gate to the withdraw operation, most certainly the only really complex function to implement, as it deals with money and has to be testet thoroughly in order to prevent unauthorized draining. So in short: only winners of games can take the money at stake (but only once of course), only the challenger is able to regain his money if nobody accepts (but only once of course), timeouts penalize challenger misbehaviour.  

### UX Subproject

The React DApp part is meant to demonstrate responsive state handling by using Redux (Redux manages the global app state and dispatches actions as soon as the Web3 events occur.) and automated End2End testing using Dappeteer+Puppeteer. The latter enable us using Chromium/Metamask/Infura/Ropsten to simulate one player calling Web3, signing transactions and so on, while using Truffle's HD-wallet-provider to emulate the other player.  

We assume readers are familiar with Metamask, BIP32/39 (hierarchical deterministic wallets), BIP44 (mnemonics) and faucets (faucet.ropsten.be) and are able to create and fund Ethereum adresses/keys. In terms of configuration, one copy of a 12 word Ethereum mnemonic goes to onchain/env.json, another copy goes to ux/dev/mnemonic.txt. We might ommit mnemonics in this Repo though, so that readers are forced to use their own. They are mainly used in a local context here (firing up a private Ganache chain and Metamask connecting to this private network), but you never know where this mnomonic is reused... Even using it on Ropsten is a bit of a stretch. However, we do not want to overcomplicate things here. 

How to use the webapp is quite easy to understand by reading the bet contract and onchain/tests/* on one hand and by watching the automated E2E test on ux/taskfile's ```run test``` on the other hand. However, a ux/taskfile's ```run dev``` paves the way to a manual webtest - the webapp can be played from http://localhost:1234. Don't forget to unlock Metamask/Web3 and pay attention to the appropriate events in order to sign the transactions. We would advise using the automated test however, just for sake of simplicity. The backend in question is provided by Ganache in both cases, but there is one exception to this: A ```run dev ropsten``` triggers a manual test of the local webapp against the Ropsten-deployed contracts from the onchain subproject part (see above: ropsten deploy in onchain subproject).

The details of the automated E2E test flow are specified in tests/frontend.spec.js, which is triggered when using ux/taskfile's ```run test``` . This is an elaborate script containing appropriate timeouts to let the simulation run through. So after a local Ganache chain is fired up (with our predefined mnemonics) and the bet contract is deployed (and the new contract address is written to ux/env.local.test, replacing old addresses from former testruns), and the webapp has been started, this very script comes into play and does the following: Chromium w. Metamask starts, mnemonics are imported, a game starts by signing a transaction to start a game, the game is accepted by directly calling the contract's acceptGame function from within the other provider (HDwallet), confirming & starting the bet from Chromium, publishing the result and withdrawing the won ammount.  

## Extras
### Contract Verification & Publish with Etherscan's verifyContract2
Etherscan provides a way to verify and publish the Sourcecode that corresponds to contract bytecode deployed on an Ethereum network.
As we used Ropsten network so far, it is quite natural to make use of https://ropsten.etherscan.io/verifyContract2
It is a quirk though. First Etherscan's verifyContract2 requires us to flatten our contract code. So we install truffle-flattener, then flatten Bet.sol and LibraryDemo.sol, deploy the flat file to Ropsten via Remix and, finally, check if the deployed contract matches the sourcecode we offer to verifyContract2.

```
npm install -D truffle-flattener
truffle-flattener ./contracts/Bet.sol > ./contracts/BetFlattened.sol
```

We copy/paste the content of BetFlattened.sol to Remix, compile with the same compiler version we already used within our local environment (0.4.25+commit.59dbf8f1), without optimizations, and deploy both contracts to Ropsten. The new contract addresses and the sourcecode we copy/paste to https://ropsten.etherscan.io/verifyContract2 (optimization=no) and input the ABI encoded constructor argument of our choice (64character all-zero-string).
Running verifyContract2 unfortunately results in a failed attempt (NoMatch). The reason for this behaviour at the time of this writing seems to be, that Etherscan's verifyContract2 does not play well with contracts that import libraries, no matter if flattened or not. This holds true for Rinkeby as well. Also, this holds true for flatteners other than truffle-flattener (e.g. Solidity Flattery). The only way to check the functionality of verifyContract2 is to out-comment any appearance of the lib in Bet.sol.

This is what we got with our Bet.sol code - nonflat & all lib appearance removed, on Rinkeby, again with Remix compile&deploy:
contract address: 0xdb3b57f6fa6a61baaa6b7a0fb5247cf500dd352c
deploy trx: 0xb6a391a15b341b0a7f038c3fd50897922df59f13c12fa59b175bb2a45474f7ad
constructor argument: 64 character all-zero-string (=ABI encoded zero)
successfully verified at https://rinkeby.etherscan.io/verifyContract2
- code is published at:
https://rinkeby.etherscan.io/address/0xdb3b57f6fa6a61baaa6b7a0fb5247cf500dd352c#code

### Check Contract with MyEtherWallet
https://myetherwallet.com/#contracts
search for this contract 0xdb3b57f6fa6a61baaa6b7a0fb5247cf500dd352c (& copy/paste ABI from onchain/build/__contracts_Bet_sol_Bet.abi)

### DApp Deployment to IPFS
By using IPFS for distributing the webapp we expand the censorship resistance of decentralized contracts towards the whole DApp.
We assume ipfs is installed and has a daemon running on the host computer. Also, we assume a deployable version of the webapp is in ```ux/build```. Then we can distribute our DApp and make it accessible via IPFS.

```
cd ux
ipfs init
ipfs add -r build/
```

We can check the result by opening the link to the hash of the build folder that is accessible through the ipfs https gateway: https://ipfs.io/ipfs/[Hash(build-folder)]/#/

To remain consistency when webapps undergo frequent updates, we use IPNS to provide aliases (hashes) to IPFS hashes.

```ipfs name publish [Hash(build-folder)]``` creates a permanent alias to the build folder hash that we created earlier.
We can check the result by opening the link to this IPNS hash we just created by using ```ipfs name resolve [Alias]``` or by simply using the browser: https://ipfs.io/ipns/[Alias]/#/ 

When the webapp's code is updated and built, we simply repeat 
```
ipfs add -r build/
ipfs name publish[newHash]
```
The new version of the webapp should be accessible by the same alias as before.

