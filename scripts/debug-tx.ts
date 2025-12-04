import hre from "hardhat";
import { createPublicClient, http, defineChain } from "viem";

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL as string;
  
  const sepolia = defineChain({
    id: 11155111,
    name: "sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });

  // Transaction hash from the failed transaction
  const txHash = "0xba5c88c6ce3d769214e52c2e4ea8844cdb0c9c7e82973a4d3f499d05dc2a1c26" as `0x${string}`;
  
  // Get transaction details
  const tx = await publicClient.getTransaction({ hash: txHash });
  console.log("\n=== Transaction Details ===");
  console.log("From:", tx.from);
  console.log("To (Contract):", tx.to);
  console.log("Data (Input):", tx.input);
  console.log("Value:", tx.value);
  console.log("Gas:", tx.gas);
  console.log("Gas Price:", tx.gasPrice);

  // Get transaction receipt
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  console.log("\n=== Receipt ===");
  console.log("Status:", receipt.status);
  console.log("Gas Used:", receipt.gasUsed);
  console.log("Logs:", receipt.logs.length);

  // Function selector
  const functionSelector = tx.input.slice(0, 10);
  console.log("\n=== Function Selector ===");
  console.log("Selector:", functionSelector);

  console.log("\n=== Analysis ===");
  console.log("Transaction Status: FAILED (execution reverted)");
  console.log("Caller Address:", tx.from);
  console.log("Target Contract:", tx.to);
  console.log("\n=== Likely Reasons for Failure ===");
  console.log("1. Caller is NOT an authorized relay operator");
  console.log("2. Contract is paused");
  console.log("3. Invalid function parameters");
  console.log("4. Insufficient permissions or state checks failed");
  
  console.log("\n=== Next Steps ===");
  console.log("Check if caller is relay operator:");
  console.log("  await clearNet.read.isRelayOperator(['" + tx.from + "'])");
  console.log("\nCheck if contract is paused:");
  console.log("  await clearNet.read.paused()");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
