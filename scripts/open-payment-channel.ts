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

  // Payment channel parameters
  const channelAmount = 50n * 10n ** 18n; // 50 CLR (minimum is 10 CLR)

  console.log("=== Opening Payment Channel ===");
  console.log("Your address:", account.address);
  console.log("Channel Amount:", (channelAmount / 10n ** 18n).toString(), "CLR");
  console.log("Minimum Required:", "10 CLR\n");

  // Step 1: Check CLR balance
  console.log("=== Step 1: Check CLR Balance ===");
  const balance = (await publicClient.readContract({
    address: clrAddress,
    abi: clrArtifact.abi,
    functionName: "balanceOf",
    args: [account.address],
  } as any)) as bigint;

  console.log("Balance:", (balance / 10n ** 18n).toString(), "CLR");

  if (balance < channelAmount) {
    console.log("❌ Insufficient balance! You need at least", (channelAmount / 10n ** 18n).toString(), "CLR.");
    console.log("Claim tokens from the faucet: https://dfung29.github.io/depin-vpn-project2/faucet-claim.html");
    process.exitCode = 1;
    return;
  }

  // Step 2: Check if channel already exists
  console.log("\n=== Step 2: Check Existing Channel ===");
  try {
    const existingChannel = (await publicClient.readContract({
      address: clearNetAddress,
      abi: clearNetArtifact.abi,
      functionName: "paymentChannels",
      args: [account.address],
    } as any)) as any;

    if (existingChannel[2]) { // isActive is at index 2
      console.log("⚠️  You already have an active payment channel!");
      console.log("Channel Balance:", (existingChannel[0] / 10n ** 18n).toString(), "CLR");
      console.log("Channel Nonce:", existingChannel[1].toString());
      console.log("\nUse the top-up script instead to add more funds.");
      process.exitCode = 1;
      return;
    }
  } catch (error) {
    // Channel doesn't exist yet, continue
  }

  // Step 3: Approve CLR tokens
  console.log("\n=== Step 3: Approve ClearNet to spend CLR ===");
  const approveTx = await walletClient.writeContract({
    address: clrAddress,
    abi: clrArtifact.abi,
    functionName: "approve",
    args: [clearNetAddress, channelAmount],
  });

  console.log("Approval tx:", approveTx);
  const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTx });
  console.log("✅ Approved! Block:", approveReceipt.blockNumber);

  // Step 4: Open payment channel
  console.log("\n=== Step 4: Open Payment Channel ===");
  const openChannelTx = await walletClient.writeContract({
    address: clearNetAddress,
    abi: clearNetArtifact.abi,
    functionName: "openPaymentChannel",
    args: [channelAmount],
  });

  console.log("Open channel tx:", openChannelTx);
  const openChannelReceipt = await publicClient.waitForTransactionReceipt({ hash: openChannelTx });
  console.log("✅ Payment channel opened! Block:", openChannelReceipt.blockNumber);

  // Step 5: Verify channel
  console.log("\n=== Step 5: Verify Payment Channel ===");
  const channelInfo = (await publicClient.readContract({
    address: clearNetAddress,
    abi: clearNetArtifact.abi,
    functionName: "paymentChannels",
    args: [account.address],
  } as any)) as any;

  console.log("✅ Channel Info:");
  console.log("  Balance:", (channelInfo[0] / 10n ** 18n).toString(), "CLR");
  console.log("  Nonce:", channelInfo[1].toString());
  console.log("  Active:", channelInfo[2]);

  console.log("\n🎉 Payment channel successfully opened! You can now use VPN services.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
