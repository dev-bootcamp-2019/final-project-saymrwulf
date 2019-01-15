Bet
---
The main use case of bet is to initiate bets between 2 arbitrary players. The initiator/challenger (Alice) places a bet on a list of open bets. The responder (Bob) accepts a bet from this list. Alice can put Ethers on particulary bets and Bob has to counter with the same ammount accordingly. Whoever wins the bet, wins the sum of Alice's and Bob's money, and can withdraw it from the contract. The nature of the bet is not of importance as the contract acts as a placeholder and enabler for sophisticated bets that could rely on trustworthy oracles or sophisticated cryptographic constructions (Verifiable Random Functions, Verifyable Delay Functions, zero knowledge proofs and the like); verious sorts of games could be implemented on top of this framework. In our case the bet is simple: Alice places with her bet a very simple commitment (a hash) of a random number + ephemeral salt. Bob counters with a random number and an epheremal salt. Alice confirms Bob's counter by revealing his random number + salt. (If Alice does not confirm, Bob wins by default.) The contract decides upon who wins and who loses by simply checking, that a) Alice has not cheated by sending the wrong random number (Does the commitment hold ?), and b) is `Alice-RND XOR Bob-RND` even or odd. (even: Alice wins; odd: Bob wins). This is called a commit-reveal schmema and has the nice property that winner election is not based on a trusted entity (like a bank) or deterministic randomness that could be predicted by, lets say, miners. The downside, of course, is, that you always need a peer counterparty. Also, one has to consider the back and forth being an overhead, especially if one extends the confirm-reveal to the other player as well, what we ommitted for sake of simplicity. (More on this in the `attacks and countermeasures` section.)

The project consists of 2 subprojects: 1) An Ethereum part (```onchain```)with the bet sontract and a librarydemo contract mockup (for demonstrating usage of such libs). 2) And a React/Redux webapp part (```ux```) that runs locally and uses either Ropsten or Ganache as a backend.

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
run dev ropsten    (= local webapp running with bet contract deployed at Ropsten backend)
run dev   (= local webapp running with local ganache; for manual End2End test; needs Chrome/Firefox+Metamask)
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


## Design Pattern Decisions
### Onchain
* commitment schema for random values (to enable an interactive protocol)
* salting a value before hashing it (to prevent rainbow table attacks)
* timeouts are being used, so that no money is being locked in the contract forever
* a library is used from within the main contract to give a glimpse how to save gas costs when used from other contracts  
* an eventing mechanism is used to enable responsive state changes in a webapp
* non-statechanging functions are callable (view) in order to not issue transactions from within clients
* some operations are payable so that the contract can receive (and store) payments for bets. some operations are not, in order to prevent unintentional payments (e.g. from other contracts)
* we use a mapping in order to allow data access only through typed keys. iterating is possible when using the whole collection of keys
* we do not delete game data as we want to keep past games publicly verifyable without using archival nodes. also, we save gas with this approach.
* using require() prevents transactions from running under wrong assumptions early on
* the constructor is parameterized (timeouts) to enable automatic testing
* helper functions encapsulate string management & hashing
* withdraw pattern; an isolated function that is responsible for withdraws including failed transfers.

### UX
* React/Redux for the heavy lifting of responsive design and keeping a global state
* a contract wrapper provides access to the deployed address and the contract ABI
* we use a singleton & Web3 wrapper (web3.js) to encapsulate the two different Web3 instances (one for listening to chain events via websockets, the other one to sign transactions via MetaMask)
* by using Dappeteer we can automate Metamask user interaction
* we filter events by the other player's address in order to avoid noise, so the events have to carry these addresses

## Extras
By using IPFS for distributing the webapp we expand the censorship resistance of decentralized contracts towards the whole DApp.

### DApp Deployment to IPFS
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

## Avoiding Common Attacks
### Reentrancy
The withdraw function is a potential target of another contract. By using the transfer() function we limit the ammount of wei transmitted; this ammount is not enough for the other contract to reenter.
On top of that, all state changes happen before transfer is triggered.
### Arithmetic Overflows and Underflows
Using SafeMath library (by OpenZeppelin) would be a way to avoid common flaws in checking values. 
Also, comparing hashes and random numbers is not our first concern, but computing the win (doubling the own ammount) could be susceptible to an attack. For sake of simplicity we ommit countermeasures like assertions. This is pre-alpha code.
### Unintended Ether
There are 2 methods to forcibly sending ether to a non payable function: a) sending it within a selfdestruct function (of another contract), b) by pre-calculating our contract address and sending ether to this address before our contract is instanciated.
As we do not make use of contract balances like this.balance(), this vector should not be an issue.
### DELEGATECALL
As we are using a stateless lib by using the solidity library keyword only, we feel pretty safe with regards to potential attack vectors on the library contract and its state.
### Default Visibility
We alway specify the intended visibility of functions, including the intentional public ones.
### Entropy Illusion
We certainly use randomness in our game (in an interactive protocol with the challenger doing commit/reveal), but not controlled by players other than the particular senders, who sign their transaction (including their randomness). And especially not controlled by miners (due to knowledge of block variables).
Also, it is not important if it is sound randomness. More like: Can both players predict the randomness of the other one ? It would be a totally different story if we would introduce a third party that holds gambling stake (for instance a bank) or an external random oracle. An interesting cryptographic construction is a VRF (Verifyable Random Function) that could come to rescue. This is a place to start exploration as soon as particular cryptographic primitives (like pairings) are supported by the EVM (opcodes); otherwise they are simply too expensive in terms of execution time and gas.
### External Contract Referencing
We do not make use of external, potentially malicious contracts other than a fake lib of our own.
### Parameter Padding
If an external App does not validate the parameters it uses in a transaction and sends parameters that are too short, those will be padded, which could cause all sorts of trouble, especially if the other party authorizes withdraws of other people's money. However, our withdraw access is strictly bound. And this is a problem of a client app anyway.
### Unchecked CALL Return Values
This is mostly a problem of a caller using the send() function instead of transfer().
Also, as we are using a particular withdraw pattern in which every user must call an isolated withdraw function that deals with unsuccessful withdraws.
### Race Conditions & Front Running
Users who manipulate the gas price of their transaction are possible attackers. As we use a commit/reveal schema, this sort of attack should not be a problem. However, right now we only use a one-sided schema (only the challenger commits, the other player accepts and reveals immediately). One could increase security by extending the commit/reveal protocol to the second player as well, at the cost of an additional roundtrip. Another piece of information that could lead to a frontrunning attacks is the ammount of Ether at stake. Maybe an attacker has an advantage and just waits for an opportunity to cash out, which is an incentive worth investing in targeted attacks on particular users.
Then there is the second class of attacker: miners who could be bribed or are players/stakeholders as well. This is a different playing field and has to be taken care of by the protocol itself, e.g. by introducing advanced cryptography into the EVM. There exists an interesting construction called VDF (Verifyable Delay Function) that could be used to level the playing field of stakeholders in terms of timings. (This is another prospect for further exploration.)
### DoS
An attacker could inflate the open games list to an extent that the block gas limit is exeeded when another user tries to write to the data structure via function calls. This could result in funds freezing. So the question remains, can they withdraw their win if another party bloated the open games list with little or no stake (empty games). However, we implemented the withdraw pattern (individual withdraw function that handles individual stake state) and should be secure to a certain extend. The data structure is small and not iterable on its own. We could set a maximum of open games though. There is plenty of room for improvement.
### Block Timestamp Manipulation
We do not use blocktime or blockheight for entropy generation (see remarks for Entropy Illusion), so there is no threat from that side. We use timeouts though, but do not think that delay of withdraw is a major concern. Of course, this assumption is targets simple attacks; it is not obvious what could happen in sophisticated attacks with the delay being just a piece in a puzzle.
### Constructors
If there has been a coding error or a refactoring mistake, so that the constructor name does not match the contract name anymore, the constructor becomes a normal function that anyone can call. As we use the constructor keyword explicitly, this should not be a concern anymore.
### Uninitialized Storage Pointers
Uninitialized local variables within functions may contain values of other storage variable in the contract, which could be exploitable in a deliberate fashion. However, we did pay attention to the respective compiler warnings. Also, we used the memory keyword explicitly to rule out unintended storage pointers.
### Tx.Origin
Solidity's global tx.origin variable should not be used for caller authorization as this is susceptible to phishing attacks. One could use it in a whitelist fashion to rule out external contracts calling our contract within a require statement though. However, we did not use tx.origin at all.




