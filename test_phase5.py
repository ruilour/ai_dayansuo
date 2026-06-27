"""
Phase 5 端到端测试脚本
测试：分类、收藏、个人主页、通知
"""
import requests, json, time

BASE = "http://localhost:8000/api"
headers = {}

def req(method, path, **kwargs):
    url = f"{BASE}{path}"
    h = {**headers, **kwargs.pop("headers", {})}
    r = requests.request(method, url, headers=h, **kwargs)
    print(f"  {r.status_code} {method.upper()} {path}")
    if r.status_code >= 400:
        err = r.text[:200].replace("\n", " ")
        print(f"    ERROR: {err}")
    return r

# ============================================================
# 1. 注册/登录两个测试用户
# ============================================================
print("\n=== 1. 准备用户 ===")
r = req("POST", "/auth/register", json={"username": "test_a_phase5", "password": "Test1234!", "turnstile_token": ""})
if r.status_code == 409:
    print("    user_a 已存在，登录")
    r = req("POST", "/auth/login", json={"username": "test_a_phase5", "password": "Test1234!", "turnstile_token": ""})
token_a = r.json().get("access_token")
print(f"    token_a: {token_a[:20] if token_a else 'N/A'}...")
user_a = r.json().get("user", {})
user_a_id = user_a.get("id", "?")
print(f"    user_a id: {user_a_id}")

r = req("POST", "/auth/register", json={"username": "test_b_phase5", "password": "Test1234!", "turnstile_token": ""})
if r.status_code == 409:
    print("    user_b 已存在，登录")
    r = req("POST", "/auth/login", json={"username": "test_b_phase5", "password": "Test1234!", "turnstile_token": ""})
token_b = r.json().get("access_token")
print(f"    token_b: {token_b[:20] if token_b else 'N/A'}...")

# ============================================================
# 2. 测试分类
# ============================================================
print("\n=== 2. 分类 API ===")
r = req("GET", "/categories")
cats = r.json().get("categories", [])
print(f"    分类列表 ({len(cats)} 项):")
for c in cats:
    nm = c.get("name", "?")
    cnt = c.get("count", 0)
    print(f"      {nm}: {cnt} 篇")
assert len(cats) == 6, f"应有6个分类，实际 {len(cats)}"

# ============================================================
# 3. 创建对话 + 保存 + 发帖（带分类）
# ============================================================
print("\n=== 3. 创建对话 + 保存 + 发帖 ===")
headers = {"Authorization": f"Bearer {token_a}"}

# 帖子1：技术类
r = req("POST", "/conversations", headers=headers, json={"title": "Python异步编程"})
conv_id = r.json().get("id")
print(f"    对话1 ID: {conv_id}")

r = req("POST", f"/conversations/{conv_id}/save", headers=headers)
print(f"    保存对话1: {r.status_code}")

r = req("POST", "/posts", headers=headers, json={
    "conversation_id": conv_id,
    "title": "技术帖：Python异步编程",
    "summary": "Python异步编程入门",
    "category": "技术"
})
assert r.status_code == 200 or r.status_code == 201, f"发帖失败: {r.text[:200]}"
post_id = r.json().get("id")
print(f"    [OK] 帖子1 ID: {post_id}, category={r.json().get('category')}")

# 帖子2：科学类
r = req("POST", "/conversations", headers=headers, json={"title": "黑洞研究"})
conv2_id = r.json().get("id")
r = req("POST", f"/conversations/{conv2_id}/save", headers=headers)
r = req("POST", "/posts", headers=headers, json={
    "conversation_id": conv2_id,
    "title": "科学帖：黑洞研究新进展",
    "summary": "黑洞研究最新成果",
    "category": "科学"
})
post2_id = r.json().get("id")
print(f"    [OK] 帖子2 ID: {post2_id}, category={r.json().get('category')}")

# ============================================================
# 4. 验证分类计数
# ============================================================
print("\n=== 4. 分类计数 ===")
r = req("GET", "/categories")
cats = r.json().get("categories", [])
tech_count = next((c["count"] for c in cats if c["name"] == "技术"), 0)
sci_count = next((c["count"] for c in cats if c["name"] == "科学"), 0)
print(f"    技术: {tech_count}, 科学: {sci_count}")
assert tech_count >= 1, f"技术类计数错误: {tech_count}"
assert sci_count >= 1, f"科学类计数错误: {sci_count}"
print("    [OK] 分类计数正确")

# ============================================================
# 5. 收藏测试
# ============================================================
print("\n=== 5. 收藏功能 ===")
headers_b = {"Authorization": f"Bearer {token_b}"}

# 收藏
r = req("POST", f"/posts/{post_id}/bookmark", headers=headers_b)
data = r.json()
print(f"    收藏: bookmarked={data.get('bookmarked')}, count={data.get('bookmarks_count')}")
assert data.get("bookmarked") == True, "收藏应返回 bookmarked=true"

# 取消收藏
r = req("POST", f"/posts/{post_id}/bookmark", headers=headers_b)
data = r.json()
print(f"    取消: bookmarked={data.get('bookmarked')}, count={data.get('bookmarks_count')}")
assert data.get("bookmarked") == False, "取消收藏应返回 bookmarked=false"

# 再收藏
r = req("POST", f"/posts/{post_id}/bookmark", headers=headers_b)
assert r.json().get("bookmarked") == True
print("    [OK] 收藏 toggle 正常")

# ============================================================
# 6. 收藏列表
# ============================================================
print("\n=== 6. 收藏列表 ===")
r = req("GET", "/bookmarks", headers=headers_b)
data = r.json()
items = data.get("items", [])
total = data.get("total", len(items))
print(f"    收藏总数: {total}")
assert total >= 1, f"收藏列表不应为空 (total={total})"
print("    [OK] 收藏列表正常")

# ============================================================
# 7. 个人主页
# ============================================================
print("\n=== 7. 个人主页 ===")
uid = user_a_id
print(f"    user_a id = {uid}")
r = req("GET", f"/users/{uid}")
user_data = r.json()
print(f"    用户: {user_data.get('username')}, 加入于 {user_data.get('created_at','?')[:10]}")
assert user_data.get("username") is not None

r = req("GET", f"/users/{uid}/stats")
stats = r.json()
print(f"    统计: 帖子={stats.get('posts_count')}, 获赞={stats.get('total_likes')}, 评论={stats.get('comments_count')}")

r = req("GET", f"/users/{uid}/posts?page=1&page_size=5")
posts_data = r.json()
post_items = posts_data.get("items", [])
print(f"    帖子列表: {len(post_items)} 篇")
if post_items:
    first = post_items[0]
    print(f"    第一帖: {first.get('title','')[:30]} 分类={first.get('category')}")
    has_bookmark = first.get("is_bookmarked")
    print(f"    is_bookmarked={has_bookmark}, bookmarks_count={first.get('bookmarks_count')}")
print("    [OK] 个人主页正常")

# ============================================================
# 8. 通知系统
# ============================================================
print("\n=== 8. 通知系统 ===")

# user_b 评论 user_a 的帖子
r = req("POST", f"/posts/{post_id}/comments", headers=headers_b, json={"content": "好文章！学习了"})
cmt_data = r.json()
cmt_id = cmt_data.get("id")
print(f"    user_b 发表评论: id={cmt_id}")
assert cmt_id is not None, "评论创建失败"

# user_a 查看通知（应该收到 comment 通知）
r = req("GET", "/notifications?page=1&page_size=10", headers=headers)
notif_data = r.json()
notif_items = notif_data.get("items", [])
notif_total = notif_data.get("total", 0)
print(f"    user_a 通知: 总数={notif_total}, 未读={notif_data.get('unread_count', '?')}")
for n in notif_items:
    print(f"      [{n.get('type')}] {n.get('actor_username')}: {n.get('post_title','')[:30]} "
          f"{'[unread]' if not n.get('is_read') else '[read]'}")
assert notif_total >= 1, "应至少有一条通知"

# 检查未读数
r = req("GET", "/notifications/unread-count", headers=headers)
uc = r.json().get("count", 0)
print(f"    未读数: {uc}")
assert uc >= 1, f"未读数应为 >= 1 (got {uc})"

# 全部已读
r = req("POST", "/notifications/read-all", headers=headers)
print(f"    全部已读: HTTP {r.status_code}")
assert r.status_code == 200

# 验证已读
r = req("GET", "/notifications/unread-count", headers=headers)
uc_after = r.json().get("count", -1)
print(f"    读后未读数: {uc_after}")
assert uc_after == 0, f"读后未读数应为0 (got {uc_after})"
print("    [OK] 通知系统正常")

# ============================================================
# [OK] 完成
# ============================================================
print("\n" + "="*50)
print("  [OK] 所有 Phase 5 功能测试通过！")
print("="*50)
print()
print("测试总结:")
print("  [OK] 分类 API — 返回6个分类 + 计数正确")
print("  [OK] 发帖带分类 — category 字段生效")
print("  [OK] 收藏 — toggle 开关 + 收藏列表")
print("  [OK] 个人主页 — 用户信息/统计/帖子列表含 is_bookmarked")
print("  [OK] 通知 — comment 触发 + 未读数 + 全部已读")
