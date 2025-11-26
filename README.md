# NebulaFlow - Web3 押金挑战活动平台

NebulaFlow 是一个基于区块链的押金挑战活动平台，支持创建和管理押金奖池活动。

## 🚀 快速开始

### 1. 安装依赖

```bash
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

### 3. 启动本地网络

```bash
npx hardhat node
```

### 4. 部署合约

在另一个终端中运行：

```bash
npx hardhat run scripts/deploy-activity-system.ts --network localhost
```

部署后会输出合约地址，请保存这些地址。

### 5. 更新前端配置

编辑以下文件，更新合约地址：

- `client/app/create/page.tsx`
- `client/app/activities/page.tsx`
- `client/app/all-activities/page.tsx`
- `client/app/dashboard/page.tsx`
- `client/app/profile/page.tsx`

将 `ACTIVITY_FACTORY_ADDRESS` 和 `ACTIVITY_REGISTRY_ADDRESS` 更新为部署输出的地址。

### 6. 启动前端

```bash
cd client
npm run dev
```

访问 http://localhost:3000

## 📋 功能特性

- ✅ 创建押金挑战活动
- ✅ 活动注册和管理
- ✅ 查看所有活动
- ✅ 用户活动追踪

## 🏗️ 项目结构

```
NebulaFlow/
├── contracts/          # 智能合约
│   ├── ActivityRegistry.sol    # 活动注册表
│   ├── ActivityFactory.sol     # 活动工厂
│   └── Challenge.sol           # 押金挑战合约
├── scripts/            # 部署脚本
│   ├── deploy-activity-system.ts
│   ├── verify-factory.ts
│   └── debug_read_activities.ts
├── client/             # 前端应用
│   ├── app/            # Next.js 页面
│   ├── components/      # React 组件
│   └── lib/            # 工具函数
└── test/               # 测试文件
```

## 📚 更多信息

- 详细架构: `ARCHITECTURE.md`
- 快速开始: `QUICKSTART.md`
