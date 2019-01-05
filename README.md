Bet
---

The project consists of `onchain` files and the `ux` (React&Redux).

## Dependencies

* Parcel bundler
* Truffle
* Solc
* ganache-cli

Also, we need `runner-cli` task runner - tasks are declared in `onchain/taskfile` (`ux/taskfile` respecfully).

## Onchain

* dependencies: `run init`
* test suite: `run test`
* Compile contract: `run build`
* Deploy: `run deploy`

## Ux

* Develop with local chain `run dev`
    * Start a local chain (ganache-cli)
    * Deploy the contract to the local chain
    * Open Browser with MetaMask pointing to ganache
    * Bundle and serve ux
* Develop with remote chain: `run dev ropsten`
    * Start devserver
* Build for release: `run build`
    * Bundle static ux assets to `./build`
* Run full test: `run test`
    * Start a local chain
    * Deploy the contracts to the local chain
    * Bundle ux
    * Start local server
    * puppeteer/dappeteer
    * Run tests locally


in onchain do ```run init```, ```run test``` and ```run deploy```

in ux do ```run init```, ```run test```, ```run dev {ropsten}``` and ```run build```
