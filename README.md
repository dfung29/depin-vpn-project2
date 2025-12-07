# ClearNet Smart Contracts

Decentralized P2P VPN marketplace with transparent payments, reputation system, and node staking.

## Overview

ClearNet is a blockchain-based VPN network where:
- **Node operators** stake CLR tokens to provide VPN bandwidth and earn 90% of session fees
- **Users** open payment channels with CLR tokens and pay per minute of usage
- **Reputation system** tracks node quality through client ratings
- **On-chain transparency** ensures fair fee distribution (90% node / 5% treasury / 5% maintenance)


## Deployed Contracts (Sepolia Testnet)

| Contract | Address | Etherscan |
|----------|---------|-----------|
| CLRToken | `0xf1664c17887767c8f58695846babb349ca61d2e9` | [View](https://sepolia.etherscan.io/address/0xf1664c17887767c8f58695846babb349ca61d2e9) |
| ClearNet | `0x0305e95225f65db13e98c775dbb95b98178ae73b` | [View](https://sepolia.etherscan.io/address/0x0305e95225f65db13e98c775dbb95b98178ae73b) |
| CLRFaucet | `0xA86b97D7CF0c00cd0e82bBDCe9F06d689cFb12b5` | [View](https://sepolia.etherscan.io/address/0xA86b97D7CF0c00cd0e82bBDCe9F06d689cFb12b5) |


## Contracts

- **ClearNet.sol** - Main contract for node registry, payment channels, and reputation
- **CLRToken.sol** - ERC-20 test token for payments
- **CLRFaucet.sol** - Testnet faucet for distributing CLR tokens

## Prerequisites

- Node.js 18+ and pnpm
- An Ethereum wallet with private key
- Sepolia testnet ETH (for deployment) - [Get from faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
- Alchemy/Infura RPC endpoint (or other Sepolia provider)

## Installation

```powershell
# Clone the repository
git clone https://github.com/dfung29/depin-vpn-project2.git
cd depin-vpn-project2

# Install dependencies
pnpm install
```

## Configuration

Create a .env file in the project root:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
SEPOLIA_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
```

**Security Warning:** Never commit your .env file or share your private key!

## Compilation

Compile all contracts:

```powershell
pnpm hardhat compile
```

This will:
- Compile Solidity contracts to artifacts/ directory
- Generate TypeScript bindings
- Check for compilation errors

To clean and recompile:

```powershell
pnpm hardhat clean
pnpm hardhat compile
```

## Testing

Run the test suite:

```powershell
pnpm test
```

This validates:
- ✅ Contract artifacts are properly compiled
- ✅ ABI and bytecode integrity  
- ✅ Required functions exist in each contract
- ✅ Deployed contract addresses on Sepolia testnet

Tests complete in ~13ms with no external dependencies required.

## Using the Contracts

The contracts are already deployed on Sepolia testnet. Here's how to interact with them:

## Contract Verification (Optional)

Verify contracts on Etherscan for transparency:

```powershell
# Verify ClearNet (pass CLRToken address as constructor argument)
pnpm hardhat verify --network sepolia YOUR_CLEARNET_ADDRESS "0xf1664c17887767c8f58695846babb349ca61d2e9"

# Verify CLRFaucet
pnpm hardhat verify --network sepolia YOUR_FAUCET_ADDRESS "0xf1664c17887767c8f58695846babb349ca61d2e9"

# Verify CLRToken (no constructor args)
pnpm hardhat verify --network sepolia YOUR_TOKEN_ADDRESS
```

**Note:** Verification may fail if contracts were compiled with `viaIR: true`. In that case, you can use manual verification on Etherscan or skip verification (source code is public in this repo).

### For Node Operators:

1. **Acquire CLR tokens** from the [test faucet](https://sepolia.etherscan.io/address/0xA86b97D7CF0c00cd0e82bBDCe9F06d689cFb12b5)

2. **Approve ClearNet contract** to spend your tokens:
   ```javascript
   // Using ethers.js or viem
   await clrToken.approve(
     "0x0305e95225f65db13e98c775dbb95b98178ae73b", // ClearNet address
     ethers.parseEther("1000") // MIN_STAKE amount
   );
   ```

3. **Register your node**:
   ```javascript
   await clearnet.registerNode(
     "192.168.1.100",           // Your VPN server IP
     8080,                       // Port
     ethers.parseEther("0.01")  // Price per minute in CLR
   );
   ```

4. **Start your VPN server** software and begin earning fees

### For Users:

1. **Acquire CLR tokens** from the [test faucet](https://sepolia.etherscan.io/address/0xA86b97D7CF0c00cd0e82bBDCe9F06d689cFb12b5)

2. **Approve and open a payment channel**:
   ```javascript
   // Approve tokens
   await clrToken.approve(
     "0x0305e95225f65db13e98c775dbb95b98178ae73b",
     ethers.parseEther("100")
   );
   
   // Open channel with deposit
   await clearnet.openChannel(ethers.parseEther("100"));
   ```

3. **Connect to available nodes** using a VPN client

4. **Sessions are settled on-chain** after disconnection with cryptographic proofs

## Key Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| MIN_STAKE | 1,000 CLR | Minimum stake for node registration |
| MIN_PRICE_PER_MIN | 0.01 CLR | Minimum price per minute |
| MAX_PRICE_PER_MIN | 100 CLR | Maximum price per minute |
| MIN_CHANNEL_BALANCE | 10 CLR | Minimum payment channel deposit |
| INITIAL_REPUTATION | 3.000 | Starting reputation score |
| Fee Split | 90/5/5 | Node / Treasury / Maintenance |

## Architecture

```
┌─────────┐         ┌──────────┐         ┌──────────┐
│ Client  │────────>│ ClearNet │<────────│   Node   │
│ (Wallet)│         │ Contract │         │ Operator │
└─────────┘         └──────────┘         └──────────┘
     │                    │                     │
     │ 1. Deposit CLR     │                     │
     │ 2. Open Channel    │  2. Stake CLR       │
     │                    │  3. Register Node   │
     │ 3. Connect to Node ├────────────────────>│
     │ 4. Sign payment    │  4. Earn 90% fees   │
     │                    │                     │
     └───────────┬────────┘
                 │
                 v
           ┌──────────┐
           │ CLRToken │
           │ (ERC-20) │
           └──────────┘
```

## Security Considerations

- **Audits:** Contracts have not been professionally audited (testnet phase only)
- **IP Privacy:** Current implementation stores IP addresses on-chain (test only)
  - Production should use IPFS hashes or encrypted off-chain storage
- **Signature Replay:** Protected by nonce and signature consumption mapping
- **Reentrancy:** Guarded by OpenZeppelin's ReentrancyGuard
- **Slashing:** Future governance feature for penalizing bad actors

## Development

### Project Structure

```
depin-vpn-project2/
 contracts/           # Solidity smart contracts
    ClearNet.sol    # Main VPN marketplace contract
    CLRToken.sol    # Test ERC-20 token
    CLRFaucet.sol   # Token faucet for testing
 scripts/            # Deployment and interaction scripts
 test/               # Test suite (Node.js test runner)
 hardhat.config.ts   # Hardhat configuration
 README.md           # This file
```

### Local Development

Run a local Hardhat node for manual testing:

```powershell
pnpm hardhat node
```

This starts a local Ethereum instance on `http://127.0.0.1:8545` with 20 pre-funded test accounts.

In another terminal, compile and interact with contracts:

```powershell
# Compile contracts
pnpm hardhat compile

# Deploy to local network
pnpm hardhat run scripts/deploy-clearnet.ts --network localhost
```

## Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Viem Documentation](https://viem.sh/)
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [CLR Faucet (for testing)](https://dfung29.github.io/depin-vpn-project2/faucet-claim.html)

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## Contact

- GitHub: [@dfung29](https://github.com/dfung29)
- Repository: [depin-vpn-project2](https://github.com/dfung29/depin-vpn-project2)
