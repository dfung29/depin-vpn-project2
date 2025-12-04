import hre from "hardhat";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL as string;
  const pk = process.env.SEPOLIA_PRIVATE_KEY as string;
  if (!rpcUrl || !pk) {
    throw new Error("Missing SEPOLIA_RPC_URL or SEPOLIA_PRIVATE_KEY in .env");
  }

  // Use existing CLRToken address
  const clrTokenAddress = "0xf1664c17887767c8f58695846babb349ca61d2e9";
  console.log("Using existing CLRToken at:", clrTokenAddress);

  // Check if ClearNet already deployed
  const deploymentFile = path.join(__dirname, "../.deployments.json");
  if (fs.existsSync(deploymentFile)) {
    const deployments = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
    console.log("\n⚠️  Existing ClearNet deployment found:");
    console.log("ClearNet:", deployments.clearNet);
    console.log("\n❌ Aborting deployment to prevent overwriting!\n");
    console.log("If you want to redeploy ClearNet, delete .deployments.json first:");
    console.log("  del .deployments.json\n");
    process.exitCode = 1;
    return;
  }

  const account = privateKeyToAccount(pk as `0x${string}`);
  const chain = defineChain({ id: 11155111, name: "sepolia", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } });
  const deployer = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

  // Read ClearNet artifact
  const clearNetArtifact = await hre.artifacts.readArtifact("ClearNet");

  // Deploy ClearNet with existing CLRToken address
  console.log("\nDeploying ClearNet with updated payment channel tracking...");
  const clearNetHash = await deployer.deployContract({
    abi: clearNetArtifact.abi,
    bytecode: clearNetArtifact.bytecode,
    args: [clrTokenAddress],
  });
  const clearNetReceipt = await publicClient.waitForTransactionReceipt({ hash: clearNetHash });
  const clearNetAddress = clearNetReceipt.contractAddress!;
  console.log("✅ ClearNet deployed to:", clearNetAddress);

  // Save deployment addresses
  const deploymentData = {
    clrToken: clrTokenAddress,
    clearNet: clearNetAddress,
    deploymentTime: new Date().toISOString(),
    network: "sepolia",
    deployedBy: account.address,
    note: "ClearNet redeployed with payment channel tracking, using existing CLRToken",
  };

  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
  console.log("\n✅ Deployment address saved to .deployments.json");
  console.log("✅ Your existing CLR token balance is still available!");
  console.log("\nNext steps:");
  console.log("1. Update other scripts (register-node.ts, etc.) to use new ClearNet address");
  console.log("2. You can now use getActivePaymentChannels() to view open channels");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
