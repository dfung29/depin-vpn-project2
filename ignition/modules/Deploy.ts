import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeployModule = buildModule("ClearNetDeploy", (m) => {
  // Deploy CLRToken first
  const clrToken = m.contract("CLRToken");

  // Deploy ClearNet with CLRToken address
  const clearNet = m.contract("ClearNet", [clrToken]);

  return { clrToken, clearNet };
});

export default DeployModule;
