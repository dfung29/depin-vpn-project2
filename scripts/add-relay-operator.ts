import hre from "hardhat";
import { createWalletClient, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL as string;
  const pk = process.env.SEPOLIA_PRIVATE_KEY as string;

  if (!rpcUrl || !pk) {
    throw new Error("Missing SEPOLIA_RPC_URL or SEPOLIA_PRIVATE_KEY in .env");
  }

  const sepolia = defineChain({
    id: 11155111,
    name: "sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });

  const account = privateKeyToAccount(pk as `0x${string}`);
  const walletClient = createWalletClient({ account, chain: sepolia, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });

  const clearNetArtifact = await hre.artifacts.readArtifact("ClearNet");
  const clearNetAddress = "0xb6f537b38b82d08ff3ed796754d9d85b5cfe9cb5" as `0x${string}`;

  // The relay operator address you want to add (replace with your desired address)
  const relayOperatorAddress = "0x26f6e150da10abea82fdc55c93d2fb25386fcaa0" as `0x${string}`;

  console.log("=== Adding Relay Operator ===");
  console.log("Your address (owner):", account.address);
  console.log("ClearNet contract:", clearNetAddress);
  console.log("Relay operator to add:", relayOperatorAddress);

  // Check if already a relay operator
  const isAlreadyRelay = await publicClient.readContract({
    address: clearNetAddress,
    abi: clearNetArtifact.abi,
    functionName: "isRelayOperator",
    args: [relayOperatorAddress],
  } as any) as boolean;

  console.log("\nCurrent status:", isAlreadyRelay ? "Already a relay operator" : "Not a relay operator");

  if (isAlreadyRelay) {
    console.log("\n✅ Address is already a relay operator!");
    return;
  }

  // Add relay operator
  console.log("\nAdding relay operator...");
  const tx = await walletClient.writeContract({
    address: clearNetAddress,
    abi: clearNetArtifact.abi,
    functionName: "addRelayOperator",
    args: [relayOperatorAddress],
  });

  console.log("Transaction hash:", tx);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log("✅ Transaction confirmed! Block:", receipt.blockNumber);

  // Verify
  const isNowRelay = await publicClient.readContract({
    address: clearNetAddress,
    abi: clearNetArtifact.abi,
    functionName: "isRelayOperator",
    args: [relayOperatorAddress],
  } as any) as boolean;

  console.log("\n=== Verification ===");
  console.log("Is relay operator:", isNowRelay ? "✅ YES" : "❌ NO");
  
  if (isNowRelay) {
    console.log("\n🎉 Successfully added relay operator!");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
