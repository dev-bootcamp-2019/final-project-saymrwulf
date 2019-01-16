## Design Pattern Decisions
### Onchain

* We explicitly state the permission level of functions and data structures so that we are completely aware of what functions and data are visible to or callable by wallet addresses or other contract addresses.
* We sanitize input to state modifying functions by using assertionlike require(). Compared to if-statements this has the advantage of implicitly calling revert() and throwing a laud error on the caller. (If-s tend to silently abort.) Also, this prevents transactions from running under wrong assumptions early on.
* We use a state machine for the game's data structure; every callable action checks the state of a game accordingly.
* We use a commitment schema for random values to enable an interactive protocol. (commit-reveal)
* We salt a random value before hashing it in order to prevent rainbow table attacks.
* Timeouts are being used, so that no money is being locked in the contract forever. However, the constructor is parameterized in terms of timeouts, to enable automatic testing.
* A library is used from within the main contract to give a glimpse how to save gas costs when used from other contracts. (separation of concern pattern, code reuse pattern)  
* Action throttling (speed bumps) is used to a certain extend, to delay game action.
* An eventing mechanism is used to enable responsive state changes in a webapp.
* Non-statechanging functions are callable (view) in order to not issue transactions from within clients
* Some operations are payable so that the contract can receive (and store) payments for bets. some operations are not, in order to prevent unintentional payments (e.g. from other contracts)
* We use a mapping in order to allow data access only through typed keys. Iterating is possible when using the whole collection of keys.
* We do not delete game data as we want to keep past games publicly verifyable without using archival nodes. also, we save gas with this approach.
* Helper functions encapsulate string management & hashing. (separation of concern)
* We use a withdraw pattern; an isolated function that is responsible for withdraws including failed transfers.
* Circuit breaker is implemented as this was required per finalexam conditions: createGame & acceptGame operations can be blocked by the contract owner in case of emergency. On the other hand, shortcutting withdrawels favouring owners is a classic third party advantage. This increases the gametheoretic riscs for gamers; we do not want to go this road and ommit special treatment concerning withdrawals.

### UX
* React/Redux for the heavy lifting of responsive design and keeping a global state
* A contract wrapper provides access to the deployed address and the contract ABI. (facade pattern)
* We use a singleton & Web3 wrapper (web3.js) to encapsulate the two different Web3 instances (one for listening to chain events via websockets, the other one to sign transactions via MetaMask)
* By using Dappeteer we can automate Metamask user interaction. (test driven development)
* We filter events by the other player's address in order to avoid noise, so the events have to carry these addresses. (filter pattern).
