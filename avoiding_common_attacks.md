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

