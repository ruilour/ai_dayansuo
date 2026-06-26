# 防滥用系统设计文档

> 针对 AI答研所 的垃圾注册、暴力登录、内容滥用、接口滥用的综合防护方案

**版本:** v1.0  
**日期:** 2026-06-26  

---

## 1. 管理员系统

### 1.1 角色模型

两级角色，简洁够用：

| 角色 | 权限 | 说明 |
|------|------|------|
| `admin` | 全部权限 | 可管理其他管理员（邀请/移除），配置系统参数 |
| `moderator` | 举报处理 + 封禁/禁言 | 只能操作举报和处罚，不能变更系统配置 |

### 1.2 初始管理员

- 通过数据库种子脚本或 `python scripts/create_admin.py` 创建
- 在 `.env` 中配置初始管理员账号，首次登录强制修改密码
- 无公开注册管理员入口

### 1.3 用户模型扩展

在 `User` 表新增字段：

```python
role = Column(String(20), default="user")       # user / moderator / admin
status = Column(String(20), default="active")   # active / muted / banned
muted_until = Column(DateTime, nullable=True)   # 禁言到期时间
banned_until = Column(DateTime, nullable=True)  # 封禁到期时间
status_reason = Column(String(255), nullable=True)  # 封禁/禁言原因
```

### 1.4 封禁/禁言效果

- **封禁（banned）**：登录后跳转到封禁提示页，无法进行任何操作
- **禁言（muted）**：可以登录浏览，但发帖/评论接口返回 403
- **到期自动恢复**：`muted_until` / `banned_until` 过期后自动恢复为 `active`
- 处罚时发送系统通知给用户

---

## 2. Cloudflare Turnstile 验证码

### 2.1 集成方式

- 前端在注册页、登录页（失败 3 次后）嵌入 Turnstile widget
- 后端用官方的 `/siteverify` 接口校验 token
- 使用环境变量 `TURNSTILE_SITE_KEY` 和 `TURNSTILE_SECRET_KEY`（配置项已存在）

### 2.2 触发规则

| 场景 | 是否需要 Turnstile |
|------|-------------------|
| 注册新账号 | **是** |
| 登录（连续失败 < 3 次） | 否 |
| 登录（连续失败 >= 3 次） | **是** |
| 正常浏览 | 否 |

### 2.3 降级策略

- Turnstile 服务不可用时，管理员可通过环境变量 `TURNSTILE_DISABLED=true` 关闭验证
- 降级后记录日志以便监控

---

## 3. 内容安全与审核

### 3.1 多层过滤架构

```
发布/评论 → 第1层：空内容拦截 → 第2层：敏感词过滤 → 第3层：HTML净化 → 第4层：重复检测 → 第5层：AI审核 → 通过
                                                                                                    ↓ 可疑
                                                                                              管理员审核队列
```

### 3.2 各层详细

**第 1 层：空内容拦截**（已有）
- 标题最少 2 个字符
- 评论不能为空

**第 2 层：敏感词黑名单**
- 从数据库 `blocked_words` 表加载，而非硬编码
- 支持通配符和正则模式
- 管理员可通过管理后台增删敏感词

```sql
CREATE TABLE blocked_words (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pattern VARCHAR(255) NOT NULL,
    is_regex BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**第 3 层：HTML 净化**
- 使用 `bleach` 或 `nh3` 库过滤危险标签
- 只允许安全标签：`<b>`, `<i>`, `<code>`, `<pre>` 等

**第 4 层：重复内容检测**
- 同一用户 5 分钟内发布相同文本 → 拦截并提示
- 基于内容哈希值比对

**第 5 层：AI 审核**
- 调用内置 AI 模型判断内容是否违规
- 评分维度：广告、辱骂、色情、其他违规
- 评分超过阈值 → 自动标记为"可疑"，进入待审区
- 评分规则可配置

### 3.3 举报机制

**数据库表：**

```sql
CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id INT NOT NULL,         -- 举报人
    target_type VARCHAR(20) NOT NULL,  -- post / comment
    target_id INT NOT NULL,            -- 被举报内容 ID
    reason VARCHAR(50) NOT NULL,       -- spam / abuse / porn / other
    detail TEXT,                       -- 补充说明
    status VARCHAR(20) DEFAULT 'pending',  -- pending / resolved / dismissed
    handled_by INT,                   -- 处理人（管理员 ID）
    action_taken VARCHAR(50),          -- none / warning / mute / ban
    created_at DATETIME,
    handled_at DATETIME
);
```

**举报流程：**
1. 用户点击举报按钮 → 选择原因 → 提交
2. 同一内容被 3 人举报 → 自动隐藏（软删除，仅管理员可见）
3. 管理员在后台处理：忽略 / 删除 / 删除+警告 / 删除+禁言 / 封号
4. 处理完成后，举报人收到通知"你的举报已处理"
5. 举报人可在个人中心查看自己的举报历史

---

## 4. 管理员后台面板

### 4.1 页面结构

现有 Navbar 中管理员看到「管理后台」入口，路由前缀 `/admin`：

| 页面 | 路由 | 功能 |
|------|------|------|
| 管理首页 | `/admin` | 待处理举报数、封禁统计、近期举报列表 |
| 举报管理 | `/admin/reports` | 举报列表，按状态筛选（待处理/已处理/已忽略） |
| 用户管理 | `/admin/users` | 搜索用户，查看用户状态，执行封禁/解封/禁言 |
| 敏感词管理 | `/admin/blocked-words` | 增删敏感词列表 |

### 4.2 权限校验

- 前端：角色不是 `admin` / `moderator` 时，`/admin/*` 路由不渲染
- 后端：所有 `/api/admin/*` 接口检查 `current_user.role`，非管理员返回 403

### 4.3 API 端点

| 方法 | 路径 | 角色 | 功能 |
|------|------|------|------|
| GET | `/api/admin/reports` | moderator+ | 获取举报列表，支持状态筛选和分页 |
| GET | `/api/admin/reports/{id}` | moderator+ | 举报详情 |
| POST | `/api/admin/reports/{id}/resolve` | moderator+ | 处理举报（忽略/删除/处罚） |
| GET | `/api/admin/users` | moderator+ | 用户列表，支持搜索 |
| PUT | `/api/admin/users/{id}/status` | moderator+ | 变更用户状态（封禁/解封/禁言） |
| GET | `/api/admin/stats` | admin | 统计概览 |
| GET | `/api/admin/blocked-words` | admin | 敏感词列表 |
| POST | `/api/admin/blocked-words` | admin | 添加敏感词 |
| DELETE | `/api/admin/blocked-words/{id}` | admin | 删除敏感词 |

---

## 5. 接口滥用防护

沿用现有的 slowapi 限流，新增部分配置：

| 接口 | 限制 | 所在文件 |
|------|------|---------|
| 发布帖子 | 10次/小时 | `routes/posts.py`（已有） |
| 发表评论 | 20次/小时 | `routes/comments.py`（已有） |
| 点赞/收藏 | 30次/小时 | `routes/posts.py` + `routes/bookmarks.py`（已有） |
| 登录 | 5次/15分钟 | `routes/auth.py`（新增） |
| 注册 | 3次/小时 | `routes/auth.py`（新增） |

超出限制返回 `429 Too Many Requests`，消息提示"操作太频繁，请稍后再试"。

---

## 6. 非功能性要求

- 所有管理接口需要在后端校验 `current_user.role in ('admin', 'moderator')`
- 举报和封禁等敏感操作需要记录操作日志
- 前端路由 `/admin/*` 做懒加载，非管理员不加载管理页面代码
- 敏感词列表建议缓存，减少数据库查询
- Turnstile 密钥等配置通过环境变量注入，不硬编码
