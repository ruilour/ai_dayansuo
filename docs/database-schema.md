# 数据库表结构

> AI答研所 — MySQL 数据库 schema

## 总览

共 9 张表：`users`, `conversations`, `messages`, `posts`, `comments`, `post_likes`, `post_bookmarks`, `notifications`, `reports`, `blocked_words`。

---

## 用户表 `users`

存储用户账号、角色、封禁/禁言状态。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `INT` | PK, AUTO_INCREMENT | 用户 ID |
| `username` | `VARCHAR(50)` | UNIQUE, NOT NULL, INDEX | 用户名 |
| `password_hash` | `VARCHAR(255)` | NOT NULL | bcrypt 哈希密码 |
| `email` | `VARCHAR(255)` | NULLABLE | 邮箱 |
| `avatar` | `VARCHAR(255)` | NULLABLE | 头像 URL |
| `role` | `VARCHAR(20)` | DEFAULT `'user'` | 角色：`user` / `moderator` / `admin` |
| `status` | `VARCHAR(20)` | DEFAULT `'active'` | 状态：`active` / `muted` / `banned` |
| `muted_until` | `DATETIME` | NULLABLE | 禁言到期时间 |
| `banned_until` | `DATETIME` | NULLABLE | 封禁到期时间 |
| `status_reason` | `VARCHAR(255)` | NULLABLE | 封禁/禁言原因 |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | 注册时间 |

**关联：**
- `User` → `Conversation`（1:N）
- `User` → `Post`（1:N）
- `User` → `Comment`（1:N）
- `User` → `Message`（1:N，通过 conversation）
- `User` → `PostBookmark`（1:N）
- `User` → `PostLike`（1:N）
- `User` → `Notification`（1:N，作为接收者 recipient）
- `User` → `Notification.actor_id`（1:N，作为触发者 actor）
- `User` → `Report.reporter_id`（1:N）
- `User` → `Report.handled_by`（1:N，作为处理人）

---

## 对话表 `conversations`

用户与 AI 的问答对话会话。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `INT` | PK, AUTO_INCREMENT | 对话 ID |
| `user_id` | `INT` | FK → `users.id`, CASCADE | 所属用户 |
| `title` | `VARCHAR(255)` | DEFAULT `'新对话'` | 对话标题 |
| `is_saved` | `BOOLEAN` | DEFAULT `FALSE` | 是否已保存为帖子 |
| `saved_at` | `DATETIME` | NULLABLE | 保存时间 |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | `DATETIME` | ON UPDATE `CURRENT_TIMESTAMP` | 更新时间 |

**关联：**
- `Conversation` → `Message`（1:N，cascade delete）
- `Conversation` → `Post`（1:1，关联已发布的帖子）

---

## 消息表 `messages`

对话中的每条问答消息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `INT` | PK, AUTO_INCREMENT | 消息 ID |
| `conversation_id` | `INT` | FK → `conversations.id`, CASCADE, INDEX | 所属对话 |
| `role` | `ENUM('user','assistant')` | NOT NULL | 消息角色 |
| `content` | `TEXT` | NOT NULL | 消息内容 |
| `reasoning_content` | `TEXT` | NULLABLE | 推理过程（深度思考模式） |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | 创建时间 |

**索引：** `idx_message_conversation_id` ON `conversation_id`

---

## 帖子表 `posts`

用户保存对话后生成的帖子，包含 AI 回答的完整内容。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `INT` | PK, AUTO_INCREMENT | 帖子 ID |
| `user_id` | `INT` | FK → `users.id`, CASCADE | 作者 |
| `conversation_id` | `INT` | FK → `conversations.id`, CASCADE | 来源对话 |
| `title` | `VARCHAR(255)` | NOT NULL | 标题 |
| `summary` | `VARCHAR(500)` | NOT NULL | 摘要 |
| `full_content` | `TEXT` | NOT NULL | 完整内容 |
| `reasoning_content` | `TEXT` | NULLABLE | AI 推理内容 |
| `category` | `VARCHAR(20)` | DEFAULT `'其他'`, NOT NULL | 分类 |
| `likes_count` | `INT` | DEFAULT `0` | 点赞数 |
| `comments_count` | `INT` | DEFAULT `0` | 评论数 |
| `bookmarks_count` | `INT` | DEFAULT `0` | 收藏数 |
| `is_hidden` | `BOOLEAN` | DEFAULT `FALSE` | 是否隐藏（违规/举报） |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | 发布时间 |
| `updated_at` | `DATETIME` | ON UPDATE `CURRENT_TIMESTAMP` | 更新时间 |

**关联：**
- `Post` → `Comment`（1:N，cascade delete）
- `Post` → `PostLike`（1:N，cascade delete）
- `Post` → `PostBookmark`（1:N，cascade delete）

---

## 评论表 `comments`

帖子下的用户评论和回复。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `INT` | PK, AUTO_INCREMENT | 评论 ID |
| `post_id` | `INT` | FK → `posts.id`, CASCADE | 所属帖子 |
| `user_id` | `INT` | FK → `users.id`, CASCADE | 评论者 |
| `parent_id` | `INT` | FK → `comments.id`, CASCADE, NULLABLE | 父评论（回复关系） |
| `content` | `TEXT` | NOT NULL | 评论内容 |
| `is_hidden` | `BOOLEAN` | DEFAULT `FALSE` | 是否隐藏（违规/举报） |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | 评论时间 |

**自引用：** `parent_id` → `comments.id`，支持嵌套回复

---

## 点赞表 `post_likes`

用户对帖子的点赞记录。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `INT` | PK, AUTO_INCREMENT | 记录 ID |
| `user_id` | `INT` | FK → `users.id`, CASCADE | 点赞用户 |
| `post_id` | `INT` | FK → `posts.id`, CASCADE | 被点赞的帖子 |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | 点赞时间 |

**唯一约束：** `(user_id, post_id)` — 每人每帖只能点赞一次

---

## 收藏表 `post_bookmarks`

用户收藏的帖子。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `INT` | PK, AUTO_INCREMENT | 记录 ID |
| `user_id` | `INT` | FK → `users.id`, CASCADE | 收藏用户 |
| `post_id` | `INT` | FK → `posts.id`, CASCADE | 被收藏的帖子 |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | 收藏时间 |

**唯一约束：** `(user_id, post_id)` — 每人每帖只能收藏一次

---

## 通知表 `notifications`

系统通知：评论、回复、点赞、收藏、处罚等。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `INT` | PK, AUTO_INCREMENT | 通知 ID |
| `user_id` | `INT` | FK → `users.id`, CASCADE, INDEX | 接收者 |
| `actor_id` | `INT` | FK → `users.id`, CASCADE | 触发者 |
| `type` | `VARCHAR(20)` | NOT NULL | 类型：`comment` / `reply` / `like` / `bookmark` / `system_mute` / `system_ban` / `system_warning` / `report_resolved` |
| `post_id` | `INT` | FK → `posts.id`, CASCADE, NULLABLE | 相关帖子 |
| `comment_id` | `INT` | NULLABLE | 相关评论 |
| `post_title` | `VARCHAR(100)` | NULLABLE | 帖子标题快照 |
| `is_read` | `BOOLEAN` | DEFAULT `FALSE` | 是否已读 |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | 创建时间 |

---

## 举报表 `reports`

用户举报内容（帖子/评论）记录。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `INT` | PK, AUTO_INCREMENT | 举报 ID |
| `reporter_id` | `INT` | FK → `users.id`, CASCADE | 举报人 |
| `target_type` | `VARCHAR(20)` | NOT NULL | 目标类型：`post` / `comment` |
| `target_id` | `INT` | NOT NULL | 目标 ID |
| `reason` | `VARCHAR(50)` | NOT NULL | 原因：`spam` / `abuse` / `porn` / `other` |
| `detail` | `TEXT` | NULLABLE | 补充说明 |
| `status` | `VARCHAR(20)` | DEFAULT `'pending'` | 状态：`pending` / `resolved` / `dismissed` |
| `handled_by` | `INT` | FK → `users.id`, SET NULL | 处理人 |
| `action_taken` | `VARCHAR(50)` | NULLABLE | 处理动作：`none` / `warning` / `mute` / `ban` |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | 举报时间 |
| `handled_at` | `DATETIME` | NULLABLE | 处理时间 |

**自动隐藏规则：** 同一内容 `pending` 举报 ≥ 3 条时，自动设置 `is_hidden = True`

---

## 敏感词表 `blocked_words`

内容安全过滤第 2 层：敏感词模式匹配。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `INT` | PK, AUTO_INCREMENT | 词条 ID |
| `pattern` | `VARCHAR(255)` | NOT NULL | 匹配模式（支持正则） |
| `is_regex` | `BOOLEAN` | DEFAULT `FALSE` | 是否正则表达式 |
| `created_at` | `DATETIME` | DEFAULT `CURRENT_TIMESTAMP` | 添加时间 |

---

## ER 关系简图

```
users ──< conversations ──< messages
  │
  ├─< posts ──< comments (parent_id 自引用)
  │     ├─< post_likes
  │     └─< post_bookmarks
  │
  ├─< notifications
  │     (user_id=接收者, actor_id=触发者)
  │
  └─< reports
        (reporter_id=举报人, handled_by=处理人)

blocked_words  (独立，无外键)
```

---

## 索引汇总

| 表 | 索引 | 字段 |
|----|------|------|
| `users` | PRIMARY | `id` |
| `users` | UNIQUE | `username` |
| `users` | INDEX | `username` |
| `messages` | INDEX | `conversation_id` |
| `post_likes` | UNIQUE | `(user_id, post_id)` |
| `post_bookmarks` | UNIQUE | `(user_id, post_id)` |
| `notifications` | INDEX | `user_id` |
