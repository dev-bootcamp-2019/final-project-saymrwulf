Bet
---
The main use case of bet is to initiate bets between 2 arbitrary players. The initiator/challenger (Alice) places a bet on a list of open bets. The responder (Bob) accepts a bet from this list. Alice can put Ethers on particulary bets and Bob can counter accordingly. Whoever wins the bet, wins the doubled ammount (sum of Alice's and Bob's money), and can withdraw it from the contract. The nature of the bet is not of importance as the contract acts as a placeholder and enabler for sophisticated bets that could rely on trustworthy oracles or sophisticated gambling based on Verifiable Random Functions, Verifyable Delay Functions, zero knowledge proofs and the like; verious sorts of games could be implemented on top of this framework. In our case the bet is simple: Alice places with her bet a very simple commitment (a hash) of a random number + ephemeral salt. Bob counters with a random number and an epheremal salt. Alice confirms Bob's counter by revealing his random number + salt. (If Alice does not confirm, Bob wins by default.) The contract decides upon who wins and who loses by simply checking, that a) Alice has not cheated by sending the wrong random number (Does the commitment hold ?), and b) is Alice-RND XOR Bob-RND even or odd. (even: Alice wins; odd: Bob wins). 

The project consists of 2 subprojects: 1) An Ethereum part (```onchain```)with the bet sontract and a LibraryDemo contract mockup (for demonstrating usage of such libs). 2) And a React/Redux webapp (```ux```) that runs locally and uses either Ropsten or Ganache as a backend.

---

## Prep
### Global Dependencies
Here is what we need:
* node, npm, yarn, git
* runner-cli (a simple task runner)
* Parcel (a JS bundler)
* Truffle (< 5), Solc, Ganache
* our Project

This is how we do it (We assume some preinstalled software from former exercises):
```
node --version
      v11.0.0
npm --version
      6.4.1
yarn --version
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
There are two places in the project we just cloned, where readers should put their own mnemonics in right now.(see remarks about this topic in chapter Remarks / UX Subproject). 
The first place is ```onchain/env.json```, the second one is ```ux/dev/mnemonics.txt```.

### Local Dependencies   
#### Onchain Subproject
```
cd onchain
run init  (= cd ./deploy && npm install)
run build   (= contracts folder's sol file compile with solcjs)
run test     (= local truffle tests)
run deploy   (= node deploy of libraryDemo contract and bet contract to ropsten)
         The account used to deploy is 0x...
         LibraryDemo deployed at 0x...
         Bet deployed at 0x...
vi ./deploy/check-deployment.js    (insert bet contract adress from above)
node ./deploy/check-deployment.js    (= mini check on ropsten deployment success)
```
#### UX Subproject
```
cd ux
npm install
vi .env   (insert bet contract adress from onchain subproject ropsten deploy from above)
cd src/contracts
ln -s ../../../onchain/build/__contracts_Bet_sol_Bet.abi ./bet.json
cd ../..
run dev ropsten    (= local webapp running with bet contract deployed at ropsten backend)
run dev   (= local webapp running with local ganache backend; made for manual End2End test; needs Chrome/Firefox+Metamask)
run test  (= local webapp running with local ganache backend; automatic End2End test with Chromium/puppeteer/dappeteer)
```
---

## Remarks
### Onchain Subproject
A ```truffle compile && truffle migrate``` is not necessary as we stay with plain ```solcjs``` as seen in onchain's taskfile build step and with ```node deploy``` as seen in taskfile's deploy step (by using env.json). We use Truffle for local tests as can be seen in the taskfile's test step, thereby making use of Mocha testing framework for the JS based tests. Speaking of tests: the solidity based tests and the JS based tests in the tests folder are selfexplanatory and cover mainly cases of state management of edge cases of bets. Compared with these testing efforts, the bet contract (and the LibDemo mockup contract) are pretty simple: just a few functions for game creation (by the challenger), game acceptance (by the responder), game confirmation (by the challenger) and money withdrawal (by the winner). Some fitting events complement this to allow a DApp using this contract in a responsive manner.

The usefulness of Solidity testing code is somewhat limited, as it is not possible to inject function calls from different user (which we need for simulating interactions in a game). Therefor the focus is on Macha's assertions as can be seen when running the full test suite.

Besides the functions that reflect bet actions, the bet contract uses a simple data structure to manage a game's state; also it uses an iterable list of open games to chose from.

If a user visits the webapp, he can either create a new game that is then added to the list of open games or he can chose one of the open, not yet accepted (by other users), games on the list. As there is not much variation in game unfolding , the only driving force besides who the counterparty might be is, how much money is at stake. In case of game creation, the user choses a nickname, the ammount he is willing to bet, and his random number plus (hopefully random)salt. Of course, not the contract but the webapp is responsible to place a commitment (here, a hash) of this data pair at the contract's create function. In case of a user deciding not to create a new game but to accept an open, not confirmed (started) one, he sends his random number plus salt to the contract's accept function. And we need a third function, confirm, used by the initiator, in order to send his random number plus salt. Hopefully a data pair that fits his initial commitment - or he is the cheater-looser immediately. The fourth function just decides upon the winning party and opens the gate to the withdraw operation, most certainly the only really complex function to implement, as it deals with money and has to be testet thoroughly in order to prevent unauthorized draining. So in short: only winners of games can take the money at stake (but only once of course), only the challenger is able to regain his money if nobody accepts (but only once of course), timeouts penalize challenger misbehaviour.  

### UX Subproject

The React DApp part is meant to demonstrate responsive state handling by using Redux (Redux manages the global app state and dispatches actions as soon as the Web3 events occur.) and automated End2End testing using Dappeteer+Puppeteer. The latter enable us using Chromium/Metamask/Infura/Ropsten to simulate one player calling Web3, signing transactions and so on, while using Truffle's HD-wallet-provider to emulate the other player.  

We assume readers are familiar with Metamask, BIP32/39 (hierarchical deterministic wallets), BIP44 (mnemonics) and faucets (faucet.ropsten.be) and are able to create and fund Ethereum adresses/keys. In terms of configuration, one copy of a 12 word Ethereum mnemonic goes to onchain/env.json, another copy goes to ux/dev/mnemonic.txt. We might ommit mnemonics in this Repo though, so that readers are forced to use their own. They are mainly used in a local context here (firing up a private Ganache chain and Metamask connecting to this private network), but you never know where this mnomonic is reused... Even using it on Ropsten is a bit of a stretch. However, we do not want to overcomplicate things here. 

How to use the webapp is quiet easy to understand by reading the bet contract and onchain/tests/* on one hand and by watching the automated E2E test on ux/taskfile's ```run test``` on the other hand. However, a ux/taskfile's ```run dev``` paves the way to a manual webtest - the webapp can be played from http://localhost:1234. Don't forget to unlock Metamask/Web3 and pay attention to the appropriate events in order to sign the transactions. We would advise using the automated test however, just for sake of simplicity. The backend in question is provided by Ganache in both cases, but there is one exception to this: A ```run dev ropsten``` triggers a manual test of the local webapp against the Ropsten-deployed contracts from the onchain subproject part (see above: ropsten deploy in onchain subproject).

The details of the automated E2E test flow are specified in tests/frontend.spec.js, which is triggered when using ux/taskfile's ```run test``` . This is an elaborate script containing appropriate timeouts to let the simulation run through. So after a local Ganache chain is fired up (with our predefined mnemonics) and the bet contract is deployed (and the new contract address is written to ux/env.local.test, replacing old addresses from former testruns), and the webapp has been started, this very script comes into play and does the following: Chromium w. Metamask starts, mnemonics are imported, a game starts by signing a transaction to start a game, the game is accepted by directly calling the contract's acceptGame function from within the other provider (HDwallet), confirming & starting the bet from Chromium, publishing the result and withdrawing the won ammount.  


## Design Pattern Decisions

* commitment schema for random values (to enable an interactive protocol)
* salting a value before hashing it (to prevent rainbow table attacks)
* timeouts are being used, so that no money is being locked in the contract forever
* a library is used from within the main contract to give a glimpse how to save gas costs when used from other contracts  
* an eventing mechanism is used to enable responsive state changes in a webapp
* non-statechanging functions are callable (view) in order to not issue transactions from within clients
* some operations are payable so that the contract can receive (and store) payments for bets.
* 
