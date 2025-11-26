import { ethers } from "hardhat";

async function main() {
  // 使用最新部署的地址
  const REGISTRY_ADDRESS = process.env.REGISTRY_ADDRESS || "0x59b670e9fA9D0A427751Af201D676719a970857b";
  const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1";

  console.log("=".repeat(80));
  console.log("【第一步：链上数据取证】");
  console.log("=".repeat(80));
  console.log("ActivityRegistry 地址:", REGISTRY_ADDRESS);
  console.log("ActivityFactory 地址:", FACTORY_ADDRESS);
  console.log("");

  try {
    // 获取 ActivityRegistry 合约实例
    const ActivityRegistry = await ethers.getContractFactory("ActivityRegistry");
    const registry = ActivityRegistry.attach(REGISTRY_ADDRESS);

    // 1. 读取活动总数
    console.log("1️⃣ 读取 activityCount...");
    const activityCount = await registry.activityCount();
    const countNumber = Number(activityCount);
    console.log("   ✅ activityCount (原始 bigint):", activityCount.toString());
    console.log("   ✅ activityCount (数字):", countNumber);
    console.log("");

    if (countNumber === 0) {
      console.log("   ⚠️  活动总数为 0，链上确实没有活动数据");
      console.log("");
      console.log("【结论】链上没有活动数据，问题可能在于：");
      console.log("   - 创建活动交易未成功执行");
      console.log("   - 交易成功但未正确注册到 ActivityRegistry");
      console.log("   - 使用了错误的 ActivityRegistry 地址");
      return;
    }

    // 2. 读取每个活动的完整数据
    console.log(`2️⃣ 读取 ${countNumber} 个活动的完整数据...`);
    console.log("");

    for (let i = 0; i < countNumber; i++) {
      console.log(`   📋 活动 ID ${i}:`);
      try {
        const metadata = await registry.getActivityMetadata(i);
        
        console.log("      - activityContract:", metadata.activityContract);
        console.log("      - creator:", metadata.creator);
        console.log("      - title:", metadata.title);
        console.log("      - description:", metadata.description);
        console.log("      - createdAt (原始):", metadata.createdAt.toString());
        console.log("      - createdAt (时间戳):", Number(metadata.createdAt));
        console.log("      - createdAt (日期):", new Date(Number(metadata.createdAt) * 1000).toISOString());
        console.log("      - isPublic:", metadata.isPublic);
        
        // 检查活动是否有效
        const isValid = 
          metadata.activityContract !== "0x0000000000000000000000000000000000000000" &&
          metadata.title !== "" &&
          metadata.title.length > 0;
        
        console.log("      - 有效性检查:", isValid ? "✅ 有效" : "❌ 无效");
        console.log("");
      } catch (error: any) {
        console.log(`      ❌ 读取活动 ID ${i} 失败:`, error.message);
        console.log("");
      }
    }

    // 3. 验证 ActivityFactory 是否正确初始化
    console.log("3️⃣ 验证 ActivityFactory 初始化状态...");
    const ActivityFactory = await ethers.getContractFactory("ActivityFactory");
    const factory = ActivityFactory.attach(FACTORY_ADDRESS);
    const factoryRegistryAddress = await factory.activityRegistry();
    console.log("   - ActivityFactory.activityRegistry():", factoryRegistryAddress);
    console.log("   - 是否匹配:", factoryRegistryAddress.toLowerCase() === REGISTRY_ADDRESS.toLowerCase() ? "✅ 匹配" : "❌ 不匹配");
    console.log("");

    console.log("=".repeat(80));
    console.log("【链上数据取证完成】");
    console.log("=".repeat(80));
    console.log(`总计找到 ${countNumber} 个活动`);
    console.log("");

  } catch (error: any) {
    console.error("❌ 读取链上数据失败:", error.message);
    console.error("错误堆栈:", error.stack);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


