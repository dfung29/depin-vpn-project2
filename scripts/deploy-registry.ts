import { network } from "hardhat";
import { keccak256, toBytes } from "viem";

async function main() {
  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log("Deployer:", deployer.account.address);

  // 1) Deploy mock CLR token
  const token = await viem.deployContract("MockCLR");
  console.log("MockCLR deployed at:", token.address);

  // 2) Deploy ClearNetRegistry with token address
  const registry = await viem.deployContract("ClearNetRegistry", [token.address]);
  console.log("ClearNetRegistry deployed at:", registry.address);

  // 3) Approve MIN_STAKE and register a sample node to sanity-check
  const MIN_STAKE = 1000n * 10n ** 18n;
  const pricePerMinute = 10n ** 17n; // 0.1 CLR
  const metadataURI = "192.0.2.10:51820"; // example
  const metadataHash = keccak256(toBytes("metadata-v1"));

  console.log("\nApproving stake...");
  const approveTx = await token.write.approve([registry.address, MIN_STAKE]);
  await publicClient.waitForTransactionReceipt({ hash: approveTx });
  console.log("✓ Approved!");

  console.log("Registering node...");
  const registerTx = await registry.write.registerNode([metadataURI, metadataHash, pricePerMinute]);
  await publicClient.waitForTransactionReceipt({ hash: registerTx });
  console.log("✓ Node registered!");

  const info = await registry.read.getNodeConnectionInfo([deployer.account.address]);
  console.log("\nNode connection info:", info);

  const active = await registry.read.getActiveNodes();
  console.log("Active nodes:", active);

  const blockNumber = await publicClient.getBlockNumber();
  console.log("Deployed at block:", blockNumber);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
