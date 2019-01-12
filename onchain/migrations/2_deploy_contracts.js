var Bet = artifacts.require("./Bet.sol")
var LibraryDemo = artifacts.require("./LibraryDemo.sol")

module.exports = function(deployer) {
  deployer.deploy(LibraryDemo)
  deployer.link(LibraryDemo, Bet)
  deployer.deploy(Bet, 2); // timeout
}