# NebulaFlow 快速开始指南

## 🚀 快速开始

### 1. 安装依赖

```bash
cd /Users/yeyutong/project/NebulaFlow

# 安装合约依赖
npm install

# 安装前端依赖
cd client
npm install
cd ..
```

### 2. 编译智能合约

```bash
npx hardhat compile
```

### 3. 启动本地网络（可选）

```bash
npx hardhat node
```

### 4. 部署合约

```bash
# 在另一个终端中
npx hardhat run scripts/deploy-activity-system.ts --network localhost
```

部署后会输出合约地址，请保存这些地址。

### 5. 更新前端配置

编辑以下文件，更新合约地址：

**`client/app/create/page.tsx`**:
```typescript
const ACTIVITY_FACTORY_ADDRESS = "0x..."; // 从部署输出复制
```

**`client/app/activities/page.tsx`**:
```typescript
const ACTIVITY_FACTORY_ADDRESS = "0x..."; // 从部署输出复制
```

**`client/app/dashboard/page.tsx`**:
```typescript
const ACTIVITY_FACTORY_ADDRESS = "0x..."; // 从部署输出复制
```

**`client/app/profile/page.tsx`**:
```typescript
const ACTIVITY_FACTORY_ADDRESS = "0x..."; // 从部署输出复制
```

### 6. 启动前端

```bash
cd client
npm run dev
```

访问 http://localhost:3000

## 📋 使用流程

### 创建活动

1. 访问 `/create` 页面
2. 填写活动信息：
   - 活动标题
   - 活动描述
   - 押金金额（ETH）
   - 挑战天数
   - 最大参与人数
3. 提交创建

### 查看活动

1. 访问 `/activities` 页面查看活动库
2. 访问 `/profile` 页面查看个人参与的活动

### 参与押金挑战

1. 在活动详情页找到押金挑战
2. 点击"报名"按钮
3. 支付押金
4. 每日签到完成挑战
5. 完成挑战后可领取奖励

## ⚠️ 常见问题

### Q: 如何验证合约部署是否成功？
A: 运行 `npx hardhat run scripts/verify-factory.ts --network localhost` 验证 ActivityFactory 是否正确初始化。

### Q: 如何调试链上活动数据？
A: 运行 `npx hardhat run scripts/debug_read_activities.ts --network localhost` 读取链上活动数据。

### Q: 现有Challenge合约如何集成？
A: 可以手动调用 ActivityRegistry 的 `registerActivity` 将现有 Challenge 注册到系统中。

## 📚 更多信息

- 详细架构: `ARCHITECTURE.md`
- 智能合约: `contracts/`
- 前端组件: `client/components/activities/`
