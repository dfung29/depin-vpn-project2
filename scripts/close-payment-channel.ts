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

  console.log("=== Closing Payment Channel ===");
  console.log("Your address:", account.address);

  // Step 1: Check if channel exists
  console.log("\n=== Step 1: Check Payment Channel Status ===");
  try {
    const channelInfo = (await publicClient.readContract({
      address: clearNetAddress,
      abi: clearNetArtifact.abi,
      functionName: "paymentChannels",
      args: [account.address],
    } as any)) as any;

    const balance = channelInfo[0] as bigint;
    const nonce = channelInfo[1] as bigint;
    const isActive = channelInfo[2] as boolean;

    if (!isActive) {
      console.log("❌ No active payment channel found!");
      console.log("Open a channel first using: pnpm hardhat run scripts/open-payment-channel.ts --network sepolia");
      process.exitCode = 1;
      return;
    }

    console.log("Current Channel Info:");
    console.log("  Balance:", (balance / 10n ** 18n).toString(), "CLR");
    console.log("  Nonce:", nonce.toString());
    console.log("  Active:", isActive);

    // Step 2: Check CLR balance before closing
    console.log("\n=== Step 2: Check CLR Balance Before Closing ===");
    const balanceBefore = (await publicClient.readContract({
      address: clrAddress,
      abi: clrArtifact.abi,
      functionName: "balanceOf",
      args: [account.address],
    } as any)) as bigint;

    console.log("Current Balance:", (balanceBefore / 10n ** 18n).toString(), "CLR");

    // Step 3: Close payment channel
    console.log("\n=== Step 3: Close Payment Channel ===");
    console.log("⚠️  This will close your channel and refund the remaining balance.");

    const closeChannelTx = await walletClient.writeContract({
      address: clearNetAddress,
      abi: clearNetArtifact.abi,
      functionName: "closePaymentChannel",
      args: [],
    });

    console.log("Close channel tx:", closeChannelTx);
    const closeChannelReceipt = await publicClient.waitForTransactionReceipt({ hash: closeChannelTx });
    console.log("✅ Payment channel closed! Block:", closeChannelReceipt.blockNumber);

    // Step 4: Verify balance after closing
    console.log("\n=== Step 4: Verify Balance After Closing ===");
    const balanceAfter = (await publicClient.readContract({
      address: clrAddress,
      abi: clrArtifact.abi,
      functionName: "balanceOf",
      args: [account.address],
    } as any)) as bigint;

    const refunded = balanceAfter - balanceBefore;
    console.log("New Balance:", (balanceAfter / 10n ** 18n).toString(), "CLR");
    console.log("Refunded Amount:", (refunded / 10n ** 18n).toString(), "CLR");

    console.log("\n🎉 Payment channel successfully closed! Remaining balance refunded.");

  } catch (error) {
    console.log("❌ Error reading channel info or closing channel");
    console.log(error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
