# ClearNet Smart Contracts

Decentralized P2P VPN marketplace with transparent payments, reputation system, and node staking.

## Overview

ClearNet is a blockchain-based VPN network where:
- **Node operators** stake CLR tokens to provide VPN bandwidth and earn 90% of session fees
- **Users** open payment channels with CLR tokens and pay per minute of usage
- **Reputation system** tracks node quality through client ratings
- **On-chain transparency** ensures fair fee distribution (90% node / 5% treasury / 5% maintenance)

## Contracts

- **ClearNet.sol** - Main contract for node registry, payment channels, and reputation
- **CLRToken.sol** - ERC-20 test token for payments
- **CLRFaucet.sol** - Testnet faucet for distributing CLR tokens

## Prerequisites

- Node.js 18+ and pnpm
- An Ethereum wallet with private key
- Sepolia testnet ETH (for deployment) - [Get from faucet](https://sepoliafaucet.com/)
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

** Security Warning:** Never commit your .env file or share your private key!

## Compilation

Compile all contracts:

```powershell
pnpm hardhat compile
```

This will:
- Compile Solidity contracts to rtifacts/ directory
- Generate TypeScript bindings
- Check for compilation errors

To clean and recompile:

```powershell
pnpm hardhat clean
pnpm hardhat compile
```

## Testing

Run the comprehensive test suite:

```powershell
# Run all tests
pnpm hardhat test

# Run specific test file
pnpm hardhat test test/ClearNet.test.js

# Run with gas reporting
$env:REPORT_GAS='true'; pnpm hardhat test

# Run with coverage
pnpm hardhat coverage
```

## Deployment

### Step 1: Deploy CLRToken (Test Token)

The CLR token must be deployed first. If you haven't already deployed it, you can use Hardhat console:

```powershell
pnpm hardhat console --network sepolia
```

In the console:
```javascript
const CLRToken = await ethers.getContractFactory("CLRToken");
const token = await CLRToken.deploy();
await token.waitForDeployment();
const tokenAddress = await token.getAddress();
console.log("CLRToken deployed to:", tokenAddress);
```

### Step 2: Deploy ClearNet Contract

Create a deployment script scripts/deploy-clearnet.ts:

```typescript
import hre from "hardhat";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL!;
  const pk = process.env.SEPOLIA_PRIVATE_KEY!;
  
  if (!rpcUrl || !pk) {
    throw new Error("Missing SEPOLIA_RPC_URL or SEPOLIA_PRIVATE_KEY in .env");
  }

  const account = privateKeyToAccount(pk as `0x${string}`);
  const chain = defineChain({
    id: 11155111,
    name: "sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
  
  const deployer = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

  // Replace with your deployed CLRToken address
  const clrTokenAddress = "0xYOUR_CLR_TOKEN_ADDRESS";
  
  console.log(" Deploying ClearNet contract...");
  console.log(" Using CLRToken at:", clrTokenAddress);
  console.log(" Deployer:", account.address);
  
  const clearnetArtifact = await hre.artifacts.readArtifact("ClearNet");
  
  const hash = await deployer.deployContract({
    abi: clearnetArtifact.abi,
    bytecode: clearnetArtifact.bytecode as `0x${string}`,
    args: [clrTokenAddress],
  });

  console.log(" Waiting for deployment transaction:", hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  console.log("\n ClearNet deployed successfully!");
  console.log(" Contract address:", receipt.contractAddress);
  console.log(" Etherscan:", `https://sepolia.etherscan.io/address/${receipt.contractAddress}`);
  console.log("\n Next Steps:");
  console.log("1. Verify the contract on Etherscan");
  console.log("2. Node operators can stake CLR and register");
  console.log("3. Users can open payment channels");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Run the deployment:

```powershell
pnpm hardhat run scripts/deploy-clearnet.ts --network sepolia
```

### Step 3: Deploy CLRFaucet (Optional - for testing)

Deploy the faucet to distribute test tokens:

```powershell
pnpm hardhat run scripts/deploy-faucet.ts --network sepolia
```

Then fund the faucet by transferring CLR tokens to its address.

## Contract Verification

Verify contracts on Etherscan for transparency:

```powershell
# Verify ClearNet (pass CLRToken address as constructor argument)
pnpm hardhat verify --network sepolia YOUR_CLEARNET_ADDRESS "YOUR_CLR_TOKEN_ADDRESS"

# Verify CLRFaucet
pnpm hardhat verify --network sepolia YOUR_FAUCET_ADDRESS "YOUR_CLR_TOKEN_ADDRESS"

# Verify CLRToken (no constructor args)
pnpm hardhat verify --network sepolia YOUR_TOKEN_ADDRESS
```

## Post-Deployment Setup

### For Node Operators:

1. **Acquire CLR tokens** (from faucet or exchange)
2. **Approve ClearNet contract** to spend your tokens
3. **Register your node** with IP, port, and price-per-minute:
   ```powershell
   pnpm hardhat run scripts/register-node.ts --network sepolia
   ```
4. **Start your VPN server** software

### For Users:

1. **Acquire CLR tokens** from the faucet
2. **Open a payment channel** by depositing tokens into ClearNet
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
                  
   Client       ClearNet       Node     
  (Wallet)               Contract              Operator   
                  
                                                       
       1. Deposit CLR          2. Stake CLR           
       2. Open Channel         3. Register Node       
       3. Connect to Node      4. Earn 90% of fees   
       4. Sign payment                                
      
                               
                         
                           CLRToken 
                           (ERC-20) 
                         
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

### Local Testing

Run a local Hardhat node:

```powershell
pnpm hardhat node
```

In another terminal, deploy to local network:

```powershell
pnpm hardhat run scripts/deploy-clearnet.ts --network localhost
```

## Deployed Contracts (Sepolia Testnet)

| Contract | Address | Etherscan |
|----------|---------|-----------|
| CLRToken | `0xf1664c17887767c8f58695846babb349ca61d2e9` | [View](https://sepolia.etherscan.io/address/0xf1664c17887767c8f58695846babb349ca61d2e9) |
| ClearNet | `0x0305e95225f65db13e98c775dbb95b98178ae73b` | [View](https://sepolia.etherscan.io/address/0x0305e95225f65db13e98c775dbb95b98178ae73b) |
| CLRFaucet | `0xA86b97D7CF0c00cd0e82bBDCe9F06d689cFb12b5` | [View](https://sepolia.etherscan.io/address/0xA86b97D7CF0c00cd0e82bBDCe9F06d689cFb12b5) |

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
