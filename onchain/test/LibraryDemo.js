// test/LibraryDemo.js
const LibraryDemo = artifacts.require("./LibraryDemo.sol")
let LibraryDemoInstance

contract('LibraryDemo', function (accounts) {
    it("should be deployed", async function () {
        LibraryDemoInstance = await LibraryDemo.deployed()
        assert.isOk(LibraryDemoInstance, "instance should not be null")
        assert.equal(typeof LibraryDemoInstance, "object", "Instance should be an object")
    })
})