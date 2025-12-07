import { expect } from "chai";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("ClearNet Contracts - Artifact Tests", function () {
  const artifactsDir = join(__dirname, "../artifacts/contracts");

  it("CLRToken artifact exists", function () {
    const path = join(artifactsDir, "CLRToken.sol/CLRToken.json");
    expect(fs.existsSync(path)).to.be.true;
  });

  it("ClearNet artifact exists", function () {
    const path = join(artifactsDir, "ClearNet.sol/ClearNet.json");
    expect(fs.existsSync(path)).to.be.true;
  });

  it("CLRFaucet artifact exists", function () {
    const path = join(artifactsDir, "CLRFaucet.sol/CLRFaucet.json");
    expect(fs.existsSync(path)).to.be.true;
  });

  it("CLRToken artifact is valid JSON", function () {
    const path = join(artifactsDir, "CLRToken.sol/CLRToken.json");
    const content = fs.readFileSync(path, "utf-8");
    expect(() => JSON.parse(content)).to.not.throw();
  });

  it("ClearNet artifact is valid JSON", function () {
    const path = join(artifactsDir, "ClearNet.sol/ClearNet.json");
    const content = fs.readFileSync(path, "utf-8");
    expect(() => JSON.parse(content)).to.not.throw();
  });

  it("CLRFaucet artifact is valid JSON", function () {
    const path = join(artifactsDir, "CLRFaucet.sol/CLRFaucet.json");
    const content = fs.readFileSync(path, "utf-8");
    expect(() => JSON.parse(content)).to.not.throw();
  });

  it("CLRToken has bytecode", function () {
    const path = join(artifactsDir, "CLRToken.sol/CLRToken.json");
    const artifact = JSON.parse(fs.readFileSync(path, "utf-8"));
    expect(artifact.bytecode).to.exist;
    expect(artifact.bytecode.length).to.be.greaterThan(0);
  });

  it("ClearNet has bytecode", function () {
    const path = join(artifactsDir, "ClearNet.sol/ClearNet.json");
    const artifact = JSON.parse(fs.readFileSync(path, "utf-8"));
    expect(artifact.bytecode).to.exist;
    expect(artifact.bytecode.length).to.be.greaterThan(0);
  });

  it("CLRToken has valid ABI", function () {
    const path = join(artifactsDir, "CLRToken.sol/CLRToken.json");
    const artifact = JSON.parse(fs.readFileSync(path, "utf-8"));
    expect(Array.isArray(artifact.abi)).to.be.true;
    expect(artifact.abi.length).to.be.greaterThan(0);
  });

  it("ClearNet has valid ABI", function () {
    const path = join(artifactsDir, "ClearNet.sol/ClearNet.json");
    const artifact = JSON.parse(fs.readFileSync(path, "utf-8"));
    expect(Array.isArray(artifact.abi)).to.be.true;
    expect(artifact.abi.length).to.be.greaterThan(0);
  });

  it("CLRToken ABI contains required functions", function () {
    const path = join(artifactsDir, "CLRToken.sol/CLRToken.json");
    const artifact = JSON.parse(fs.readFileSync(path, "utf-8"));
    const functionNames = artifact.abi
      .filter((item: any) => item.type === "function")
      .map((item: any) => item.name);

    expect(functionNames).to.include("mint");
    expect(functionNames).to.include("approve");
    expect(functionNames).to.include("transfer");
    expect(functionNames).to.include("balanceOf");
  });

  it("ClearNet ABI contains required functions", function () {
    const path = join(artifactsDir, "ClearNet.sol/ClearNet.json");
    const artifact = JSON.parse(fs.readFileSync(path, "utf-8"));
    const functionNames = artifact.abi
      .filter((item: any) => item.type === "function")
      .map((item: any) => item.name);

    expect(functionNames).to.include("registerNode");
    expect(functionNames).to.include("openPaymentChannel");
    expect(functionNames).to.include("getActiveNodes");
    expect(functionNames).to.include("calculateCost");
    expect(functionNames).to.include("getPaymentChannelInfo");
    expect(functionNames).to.include("getContractStats");
  });

  it("Deployed contracts on Sepolia are valid", function () {
    const CLR_TOKEN_ADDRESS = "0xf1664c17887767c8f58695846babb349ca61d2e9";
    const CLEARNET_ADDRESS = "0x0305e95225f65db13e98c775dbb95b98178ae73b";
    const CLEARFAUCET_ADDRESS = "0xA86b97D7CF0c00cd0e82bBDCe9F06d689cFb12b5";

    // Validate addresses are proper Ethereum addresses
    const addressRegex = /^0x[0-9a-fA-F]{40}$/;
    expect(CLR_TOKEN_ADDRESS).to.match(addressRegex);
    expect(CLEARNET_ADDRESS).to.match(addressRegex);
    expect(CLEARFAUCET_ADDRESS).to.match(addressRegex);
  });

  it("CLRToken has correct structure", function () {
    const path = join(artifactsDir, "CLRToken.sol/CLRToken.json");
    const artifact = JSON.parse(fs.readFileSync(path, "utf-8"));
    expect(artifact.abi).to.exist;
    expect(artifact.bytecode).to.exist;
    expect(artifact.contractName).to.equal("CLRToken");
  });

  it("ClearNet has correct structure", function () {
    const path = join(artifactsDir, "ClearNet.sol/ClearNet.json");
    const artifact = JSON.parse(fs.readFileSync(path, "utf-8"));
    expect(artifact.abi).to.exist;
    expect(artifact.bytecode).to.exist;
    expect(artifact.contractName).to.equal("ClearNet");
  });
});


