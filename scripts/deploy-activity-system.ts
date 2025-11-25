import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // 1. 部署 ActivityRegistry
  console.log("\n1. 部署 ActivityRegistry...");
  const ActivityRegistry = await ethers.getContractFactory("ActivityRegistry");
  const activityRegistry = await ActivityRegistry.deploy();
  await activityRegistry.waitForDeployment();
  const registryAddress = await activityRegistry.getAddress();
  console.log("ActivityRegistry 地址:", registryAddress);

  // 2. 部署 ActivityFactory
  console.log("\n2. 部署 ActivityFactory...");
  const ActivityFactory = await ethers.getContractFactory("ActivityFactory");
  const activityFactory = await ActivityFactory.deploy(registryAddress);
  await activityFactory.waitForDeployment();
  const factoryAddress = await activityFactory.getAddress();
  console.log("ActivityFactory 地址:", factoryAddress);

  // 3. 部署 NFTReward 示例（可选，用于测试）
  console.log("\n3. 部署 NFTReward 示例...");
  const NFTReward = await ethers.getContractFactory("NFTReward");
  const nftReward = await NFTReward.deploy(
    "Test NFT",
    "TNFT",
    "https://api.example.com/metadata/",
    registryAddress,
    0, // 临时activityId
    deployer.address
  );
  await nftReward.waitForDeployment();
  const nftAddress = await nftReward.getAddress();
  console.log("NFTReward 示例地址:", nftAddress);

  console.log("\n✅ 部署完成！");
  console.log("\n请更新前端配置中的以下地址：");
  console.log(`ACTIVITY_REGISTRY_ADDRESS = "${registryAddress}"`);
  console.log(`ACTIVITY_FACTORY_ADDRESS = "${factoryAddress}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

