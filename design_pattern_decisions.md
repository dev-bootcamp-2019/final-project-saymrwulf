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
