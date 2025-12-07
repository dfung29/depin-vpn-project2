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

  const clrArtifact = await hre.artifacts.readArtifact("CLRToken");
  const clearNetArtifact = await hre.artifacts.readArtifact("ClearNet");

  const clrAddress = "0xf1664c17887767c8f58695846babb349ca61d2e9" as `0x${string}`;
  const clearNetAddress = "0x0305e95225f65db13e98c775dbb95b98178ae73b" as `0x${string}`;

  // Node registration parameters
  const ipAddress = "192.168.1.100";
  const port = 8443;
  const pricePerMinute = 10n ** 16n; // 0.01 CLR per minute
  const minStake = 1000n * 10n ** 18n; // 1000 CLR

  console.log("=== Registering VPN Node ===");
  console.log("Your address:", account.address);
  console.log("IP Address:", ipAddress);
  console.log("Port:", port);
  console.log("Price Per Minute:", pricePerMinute.toString(), "wei (0.01 CLR)");
  console.log("Required Stake:", minStake.toString(), "wei (1000 CLR)\n");

  // Step 1: Check balance
  console.log("=== Step 1: Check CLR Balance ===");
  const balance = (await publicClient.readContract({
    address: clrAddress,
    abi: clrArtifact.abi,
    functionName: "balanceOf",
    args: [account.address],
  } as any)) as bigint;

  console.log("Balance:", (balance / 10n ** 18n).toString(), "CLR");

  if (balance < minStake) {
    console.log("❌ Insufficient balance! You need 1000 CLR.");
    process.exitCode = 1;
    return;
  }

  // Step 2: Approve
  console.log("\n=== Step 2: Approve ClearNet to spend CLR ===");
  const approveTx = await walletClient.writeContract({
    address: clrAddress,
    abi: clrArtifact.abi,
    functionName: "approve",
    args: [clearNetAddress, minStake],
  });

  console.log("Approval tx:", approveTx);
  const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTx });
  console.log("✅ Approved! Block:", approveReceipt.blockNumber);

  // Step 3: Register node
  console.log("\n=== Step 3: Register Node ===");
  const registerTx = await walletClient.writeContract({
    address: clearNetAddress,
    abi: clearNetArtifact.abi,
    functionName: "registerNode",
    args: [ipAddress, port, pricePerMinute],
  });

  console.log("Registration tx:", registerTx);
  const registerReceipt = await publicClient.waitForTransactionReceipt({ hash: registerTx });
  console.log("✅ Node registered! Block:", registerReceipt.blockNumber);

  // Step 4: Verify
  console.log("\n=== Step 4: Verify Registration ===");
  const nodeInfo = (await publicClient.readContract({
    address: clearNetAddress,
    abi: clearNetArtifact.abi,
    functionName: "getNodeInfo",
    args: [account.address],
  } as any)) as any;

  console.log("✅ Node Info:");
  console.log("  IP:", nodeInfo[0]);
  console.log("  Port:", nodeInfo[1]);
  console.log("  Price Per Minute:", nodeInfo[2].toString(), "wei");
  console.log("  Reputation Score:", nodeInfo[3].toString(), "(3000 = 3.000)");
  console.log("  Total Minutes Served:", nodeInfo[4].toString());
  console.log("  Total Earnings:", nodeInfo[5].toString(), "wei");
  
  console.log("\n🎉 Successfully registered as a VPN node!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
