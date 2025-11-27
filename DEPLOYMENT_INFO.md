# 合约部署信息

## 最新部署地址（2025-11-27 - 最新）

### 合约地址
- **ActivityRegistry**: `0xE3011A37A904aB90C8881a99BD1F6E21401f1522`
- **ActivityFactory**: `0x457cCf29090fe5A24c19c1bc95F492168C0EaFdb`

### 部署账户
- 部署账户: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

### 前端配置
所有前端文件中的合约地址已更新：
- `client/app/create/page.tsx`
- `client/app/activities/page.tsx`
- `client/app/activities/[id]/page.tsx`
- `client/app/profile/page.tsx`
- `client/app/dashboard/page.tsx`

### 重要修复
1. ✅ 修复了 `ActivityRegistry.registerActivity` 的 creator 地址问题（现在使用真实用户地址）
2. ✅ 修复了活动ID索引问题（从1开始，不是0）
3. ✅ 改进了事件解析逻辑（包括备用方案）
4. ✅ 删除了所有 NFT 模式相关代码，仅保留押金池模式

### 测试
运行以下命令验证部署：
```bash
npx hardhat run scripts/debug_read_activities.ts --network localhost
```

