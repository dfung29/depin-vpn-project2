# ClearNet Smart Contract Tests

Comprehensive test suite for ClearNet P2P VPN contracts (ClearNet.sol and CLRToken.sol).

## Test Files

- **ClearNet.test.js** - Tests for the main ClearNet contract (node registry, payments, reputation)
- **CLRToken.test.js** - Tests for the CLR token contract (ERC20 functionality)

## Setup

### Prerequisites

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-network-helpers chai ethers
```

### Hardhat Configuration

Ensure your `hardhat.config.js` includes:

```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
```

## Running Tests

### Run all tests
```bash
npx hardhat test
```

### Run specific test file
```bash
npx hardhat test test/ClearNet.test.js
npx hardhat test test/CLRToken.test.js
```

### Run tests with gas reporting
```bash
REPORT_GAS=true npx hardhat test
```

### Run tests with coverage
```bash
npx hardhat coverage
```

## Test Coverage

### ClearNet.test.js (15 test suites, 50+ tests)

1. **Deployment** - Verifies contract initialization
2. **Node Registration** - Tests node registration with various scenarios
3. **Node Management** - Tests updating node info, price, and deregistration
4. **Payment Channels** - Tests opening, closing payment channels
5. **Payment Processing** - Tests payment processing with signature verification
6. **Reputation System** - Tests reputation scoring mechanics
7. **Relay Management** - Tests adding/removing relay operators
8. **Governance** - Tests two-step governance transfer
9. **Emergency Controls** - Tests pause/unpause functionality
10. **Node Slashing** - Tests stake slashing for misbehavior
11. **View Functions** - Tests read-only functions

### CLRToken.test.js (10 test suites, 30+ tests)

1. **Deployment** - Verifies token initialization
2. **Minting** - Tests token minting by owner
3. **Burning** - Tests token burning by users
4. **Transfers** - Tests ERC20 transfer functionality
5. **Allowances** - Tests approve/transferFrom mechanics
6. **Ownership** - Tests owner transfer and renouncement
7. **Edge Cases** - Tests boundary conditions

## Key Test Scenarios

### ClearNet Contract

#### Node Registration
- ✅ Successful registration with valid parameters
- ✅ Rejection of duplicate registrations
- ✅ Validation of IP address, port, and price bounds
- ✅ Proper stake locking and tracking
- ✅ Multiple node registrations

#### Payment System
- ✅ Payment channel opening with deposit
- ✅ Signature verification (client, node, relay)
- ✅ Payment processing with fee distribution (85-10-5)
- ✅ Nonce validation for replay protection
- ✅ Balance checking and updates
- ✅ Channel closing with refunds

#### Reputation System
- ✅ Initial reputation assignment (3.000)
- ✅ Reputation increase on success (+0.001)
- ✅ Reputation decrease on failure (-0.010)
- ✅ Reputation capping at maximum (5.000)

#### Security Features
- ✅ Reentrancy protection
- ✅ Signature verification
- ✅ Replay attack prevention
- ✅ Pause/unpause emergency controls
- ✅ Access control (owner, governance, relay)

### CLRToken Contract

#### ERC20 Standard
- ✅ Token transfers
- ✅ Allowance/approval mechanisms
- ✅ Balance tracking
- ✅ Total supply updates

#### Custom Features
- ✅ Owner-controlled minting
- ✅ User token burning
- ✅ Ownership transfer

## Gas Optimization Notes

The tests verify several gas optimizations:
- Struct packing (bool + uint16 + address)
- O(1) array removal using index mapping
- Efficient signature verification
- Minimal storage reads

## Expected Test Output

```
  ClearNet Contract
    Deployment
      ✓ Should set the correct CLR token address
      ✓ Should set the correct owner
      ✓ Should initialize with correct constants
    Node Registration
      ✓ Should register a node successfully
      ✓ Should fail to register with insufficient stake
      ... (48+ more tests)

  CLRToken Contract
    Deployment
      ✓ Should set the correct name and symbol
      ✓ Should set the correct decimals
      ... (28+ more tests)

  80 passing (5s)
```

## Troubleshooting

### Common Issues

1. **"Cannot find module 'hardhat'"**
   ```bash
   npm install --save-dev hardhat
   ```

2. **"Error: Insufficient funds for gas"**
   - Tests use Hardhat's local network with pre-funded accounts
   - Ensure you're running tests with `npx hardhat test`

3. **"Contract deployment failed"**
   - Check Solidity compiler version matches (0.8.28)
   - Verify OpenZeppelin contracts are installed

4. **Signature verification failures**
   - Tests use ethers.js v6 signature format
   - Ensure `@nomicfoundation/hardhat-toolbox` is installed

## Additional Testing Commands

### Test with verbose output
```bash
npx hardhat test --verbose
```

### Test with stack traces
```bash
npx hardhat test --trace
```

### Run specific test by name
```bash
npx hardhat test --grep "Should register a node successfully"
```

## CI/CD Integration

Add to your `.github/workflows/test.yml`:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx hardhat test
      - run: npx hardhat coverage
```

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all existing tests pass
3. Aim for >90% code coverage
4. Test both success and failure cases
5. Include edge case testing

## License

MIT
