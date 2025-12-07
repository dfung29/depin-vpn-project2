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
  const clrArtifact = await hre.artifacts.readArtifact("CLRToken");

  const clearNetAddress = "0x0305e95225f65db13e98c775dbb95b98178ae73b" as `0x${string}`;
  const clrAddress = "0xf1664c17887767c8f58695846babb349ca61d2e9" as `0x${string}`;

  console.log("=== Deregistering VPN Node ===");
  console.log("Your address:", account.address);

  // Step 1: Check current node info
  console.log("\n=== Step 1: Check Current Node Status ===");
  try {
    const nodeInfo = (await publicClient.readContract({
      address: clearNetAddress,
      abi: clearNetArtifact.abi,
      functionName: "getNodeInfo",
      args: [account.address],
    } as any)) as any;

    console.log("Current Node Info:");
    console.log("  IP:", nodeInfo[0]);
    console.log("  Port:", nodeInfo[1]);
    console.log("  Price Per Minute:", nodeInfo[2].toString(), "wei");
    console.log("  Reputation Score:", nodeInfo[3].toString());
    console.log("  Total Minutes Served:", nodeInfo[4].toString());
    console.log("  Total Earnings:", nodeInfo[5].toString(), "wei");
  } catch (error) {
    console.log("❌ Node not registered or error reading node info");
    console.log(error);
    process.exitCode = 1;
    return;
  }

  // Step 2: Check CLR balance before deregistration
  console.log("\n=== Step 2: Check CLR Balance Before Deregistration ===");
  const balanceBefore = (await publicClient.readContract({
    address: clrAddress,
    abi: clrArtifact.abi,
    functionName: "balanceOf",
    args: [account.address],
  } as any)) as bigint;

  console.log("Current Balance:", (balanceBefore / 10n ** 18n).toString(), "CLR");

  // Step 3: Deregister node
  console.log("\n=== Step 3: Deregister Node ===");
  console.log("⚠️  This will remove your node from the marketplace and return your staked CLR tokens.");
  
  const deregisterTx = await walletClient.writeContract({
    address: clearNetAddress,
    abi: clearNetArtifact.abi,
    functionName: "deregisterNode",
    args: [],
  });

  console.log("Deregistration tx:", deregisterTx);
  const deregisterReceipt = await publicClient.waitForTransactionReceipt({ hash: deregisterTx });
  console.log("✅ Node deregistered! Block:", deregisterReceipt.blockNumber);

  // Step 4: Verify balance after deregistration
  console.log("\n=== Step 4: Verify Balance After Deregistration ===");
  const balanceAfter = (await publicClient.readContract({
    address: clrAddress,
    abi: clrArtifact.abi,
    functionName: "balanceOf",
    args: [account.address],
  } as any)) as bigint;

  const returned = balanceAfter - balanceBefore;
  console.log("New Balance:", (balanceAfter / 10n ** 18n).toString(), "CLR");
  console.log("Returned Stake:", (returned / 10n ** 18n).toString(), "CLR");

  console.log("\n🎉 Successfully deregistered! Your stake has been returned.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
