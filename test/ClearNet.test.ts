import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseEther, getAddress } from "viem";

describe("ClearNet Simple Tests", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const wallets = await viem.getWalletClients();
  
  const owner = wallets[0];
  const node1 = wallets[1];
  const client1 = wallets[2];

  // Deploy contracts
  const clrToken = await viem.deployContract("CLRToken");
  const clearNet = await viem.deployContract("ClearNet", [clrToken.address]);

  // Setup: mint tokens
  await clrToken.write.mint([node1.account.address, parseEther("100000")]);
  await clrToken.write.mint([client1.account.address, parseEther("100000")]);

  // Approve ClearNet to spend tokens (MIN_STAKE = 1000 CLR)
  await clrToken.write.approve([clearNet.address, parseEther("10000")], { 
    account: node1.account 
  });
  await clrToken.write.approve([clearNet.address, parseEther("10000")], { 
    account: client1.account 
  });

  it("Should deploy correctly", async () => {
    const tokenAddress = await clearNet.read.clrToken();
    assert.equal(getAddress(tokenAddress), getAddress(clrToken.address));
  });

  it("Should register a node", async () => {
    await clearNet.write.registerNode(
      ["192.168.1.1", 8080, parseEther("0.1")],
      { account: node1.account }
    );
    
    const node = await clearNet.read.nodes([node1.account.address]);
    // Node struct: [ipAddress, port, isActive, stakeAmount, reputationScore, pricePerMinute, totalMinutesServed, totalEarnings, lastActivity, totalRatingValue, totalRatingCount]
    assert.equal(node[0], "192.168.1.1"); // ipAddress
    assert.equal(node[1], 8080); // port
    assert.equal(node[2], true); // isActive
    assert.equal(node[3], parseEther("1000")); // stakeAmount (MIN_STAKE)
    assert.equal(node[5], parseEther("0.1")); // pricePerMinute
  });

  it("Should open a payment channel", async () => {
    const channelAmount = parseEther("100");
    
    await clearNet.write.openPaymentChannel(
      [channelAmount],
      { account: client1.account }
    );

    const channel = await clearNet.read.paymentChannels([client1.account.address]);
    // PaymentChannel struct: [balance, nonce, isActive]
    assert.equal(channel[0], channelAmount); // balance
    assert.equal(channel[1], 0n); // nonce
    assert.equal(channel[2], true); // isActive
  });

  it("Should return active nodes", async () => {
    const activeNodes = await clearNet.read.getActiveNodes();
    assert.ok(activeNodes.length > 0);
    
    const nodeAddresses = activeNodes.map((addr: string) => getAddress(addr));
    assert.ok(nodeAddresses.includes(getAddress(node1.account.address)));
  });

  it("Should get node info", async () => {
    const nodeInfo = await clearNet.read.getNodeInfo([node1.account.address]);
    
    assert.equal(nodeInfo[0], "192.168.1.1"); // ipAddress
    assert.equal(nodeInfo[1], 8080n); // port
    assert.equal(nodeInfo[2], parseEther("0.1")); // pricePerMinute
    assert.equal(nodeInfo[3], 3000n); // reputationScore (INITIAL_REPUTATION = 3.000)
  });

  it("Should get payment channel info", async () => {
    const channelInfo = await clearNet.read.getPaymentChannelInfo([client1.account.address]);
    // Returns: [balance, nonce, isActive]
    assert.equal(channelInfo[0], parseEther("100")); // balance
    assert.equal(channelInfo[1], 0n); // nonce
    assert.equal(channelInfo[2], true); // isActive
  });

  it("Should calculate cost correctly", async () => {
    const minutesUsed = 60n;
    const expectedCost = parseEther("0.1") * minutesUsed; // 0.1 CLR/min * 60 min = 6 CLR
    
    const cost = await clearNet.read.calculateCost([node1.account.address, minutesUsed]);
    assert.equal(cost, expectedCost);
  });

  it("Should get contract stats", async () => {
    const stats = await clearNet.read.getContractStats();
    // Returns: [totalNodes, totalChannels, totalMinutes, treasuryBalance]
    assert.equal(stats[0], 1n); // totalNodes - 1 node registered
    assert.equal(stats[1], 1n); // totalChannels - 1 channel opened
    assert.equal(stats[2], 0n); // totalMinutes - No sessions yet
    assert.equal(stats[3], 0n); // treasuryBalance - No fees collected yet
  });
});
