"""
完整流程集成测试

测试场景：两个用户（test_a_phase5 / test_b_phase5）的完整交互流程
测试覆盖：
  1. 分类 API — 初始空 → 发帖后计数
  2. 发帖 — 创建对话 → 保存 → 发布帖子（技术/科学/生活）
  3. 点赞 — user_b 点赞 user_a 的帖子
  4. 收藏 — user_b 收藏 user_a 的帖子
  5. 评论 — user_b 评论 user_a 的帖子
  6. 通知 — user_a 收到 like + bookmark + comment 三条通知
  7. 未读数 → 全部已读 → 归零
  8. 收藏列表 — user_b 收藏列表可见
  9. 个人主页 — 统计/帖子/标记状态正确
  10. 帖子详情 — 各自 is_liked / is_bookmarked 正确
"""

import requests, json

BASE = "http://localhost:8000/api"


def req(method, path, **kw):
    """通用 HTTP 请求函数，自动打印状态和错误"""
    h = kw.pop("headers", {})
    r = requests.request(method, f"{BASE}{path}", headers=h, **kw)
    ok = r.status_code < 400
    print(f"  {r.status_code} {method.upper()} {path}" + ("" if ok else f"  FAIL: {r.text[:100]}"))
    return r


# ============================================================================
# 1. 登录两个测试用户
# ============================================================================
print("=== 登录 ===")
r = req("POST", "/auth/login", json={"username": "test_a_phase5", "password": "Test1234!", "turnstile_token": ""})
tok_a = r.json()["access_token"]
uid_a = r.json()["user"]["id"]
print(f"  user_a: id={uid_a}")

r = req("POST", "/auth/login", json={"username": "test_b_phase5", "password": "Test1234!", "turnstile_token": ""})
tok_b = r.json()["access_token"]
uid_b = r.json()["user"]["id"]
print(f"  user_b: id={uid_b}")

ha = {"Authorization": f"Bearer {tok_a}"}
hb = {"Authorization": f"Bearer {tok_b}"}

# ============================================================================
# 2. 初始分类状态验证
# ============================================================================
print("\n=== Step 1: 初始分类 ===")
r = req("GET", "/categories")
cats = r.json()["categories"]
for c in cats:
    print(f"  {c['name']}: {c['count']}")

# ============================================================================
# 3. user_a 创建对话 → 保存 → 发帖（3篇不同分类）
# ============================================================================
print("\n=== Step 2: 发帖 ===")

posts = []
for title, cat in [
    ("Python异步编程入门", "技术"),
    ("黑洞研究新进展", "科学"),
    ("今天做了红烧肉", "生活"),
]:
    # 3-1: 创建对话
    r = req("POST", "/conversations", headers=ha, json={"title": title})
    cid = r.json()["id"]
    # 3-2: 保存对话
    req("POST", f"/conversations/{cid}/save", headers=ha)
    # 3-3: 发帖
    r = req("POST", "/posts", headers=ha, json={
        "conversation_id": cid,
        "title": title,
        "summary": f"关于{title}的AI对话分享",
        "category": cat
    })
    pid = r.json()["id"]
    posts.append(pid)
    print(f"  [{cat}] ID={pid}: {title}")

print(f"\n  共发 {len(posts)} 篇帖子")

# ============================================================================
# 4. 验证分类计数更新
# ============================================================================
print("\n=== Step 3: 验证分类 ===")
r = req("GET", "/categories")
cats = r.json()["categories"]
tech = next(c for c in cats if c["name"] == "技术")
life = next(c for c in cats if c["name"] == "生活")
print(f"  技术={tech['count']}, 生活={life['count']}")
assert tech["count"] == 1
assert life["count"] == 1

# ============================================================================
# 5. user_b 点赞帖子1
# ============================================================================
print("\n=== Step 4: user_b 点赞帖子1 ===")
r = req("POST", f"/posts/{posts[0]}/like", headers=hb)
d = r.json()
print(f"  liked={d['liked']}, likes_count={d['likes_count']}")
assert d["liked"] == True

# ============================================================================
# 6. user_b 收藏帖子1
# ============================================================================
print("\n=== Step 5: user_b 收藏帖子1 ===")
r = req("POST", f"/posts/{posts[0]}/bookmark", headers=hb)
d = r.json()
print(f"  bookmarked={d['bookmarked']}, count={d['bookmarks_count']}")
assert d["bookmarked"] == True

# ============================================================================
# 7. user_b 评论帖子1
# ============================================================================
print("\n=== Step 6: user_b 评论帖子1 ===")
r = req("POST", f"/posts/{posts[0]}/comments", headers=hb, json={"content": "写得太好了，受益匪浅！"})
cid = r.json().get("id")
print(f"  评论ID={cid}")
assert cid

# ============================================================================
# 8. user_a 查看通知（应收到 like + bookmark + comment 共3条）
# ============================================================================
print("\n=== Step 7: user_a 查看通知 ===")
r = req("GET", "/notifications?page=1&page_size=10", headers=ha)
nd = r.json()
print(f"  总数={nd['total']}, 未读={nd['unread_count']}")
for n in nd["items"]:
    print(f"  [{n['type']:>8}] {n['actor_username']:>14} → 「{n['post_title']}」")

assert nd["total"] == 3, f"应有3条通知 (like+bookmark+comment), 实际{nd['total']}"
types = sorted(n["type"] for n in nd["items"])
assert types == ["bookmark", "comment", "like"], f"通知类型不对: {types}"

# ============================================================================
# 9. 未读数验证
# ============================================================================
print("\n=== Step 8: 未读数 ===")
r = req("GET", "/notifications/unread-count", headers=ha)
uc = r.json()["count"]
print(f"  未读={uc}")
assert uc == 3

# ============================================================================
# 10. 全部已读 → 未读归零
# ============================================================================
print("\n=== Step 9: 全部已读 ===")
req("POST", "/notifications/read-all", headers=ha)
r = req("GET", "/notifications/unread-count", headers=ha)
print(f"  读后未读={r.json()['count']}")
assert r.json()["count"] == 0

# ============================================================================
# 11. user_b 的收藏列表
# ============================================================================
print("\n=== Step 10: user_b 收藏列表 ===")
r = req("GET", "/bookmarks", headers=hb)
bd = r.json()
print(f"  总数={bd['total']}, 帖子={[i['title'] for i in bd['items']]}")
assert bd["total"] == 1

# ============================================================================
# 12. user_a 个人主页 — 统计/帖子/is_liked/is_bookmarked
# ============================================================================
print("\n=== Step 11: user_a 个人主页 ===")
r = req("GET", f"/users/{uid_a}")
print(f"  用户={r.json()['username']}")

r = req("GET", f"/users/{uid_a}/stats")
s = r.json()
print(f"  统计: 帖子={s['posts_count']}, 获赞={s['total_likes']}, 评论={s['comments_count']}")
assert s["posts_count"] == 3
assert s["total_likes"] == 1  # user_b 点了1个赞
assert s["comments_count"] == 0  # user_a 没有自己写过评论

r = req("GET", f"/users/{uid_a}/posts?page=1&page_size=5")
its = r.json()["items"]
print(f"  帖子列表: {len(its)} 篇")
for p in its:
    print(f"    [{p['category']}] {p['title'][:20]:20} "
          f"is_liked={p.get('is_liked', False)} "
          f"is_bookmarked={p.get('is_bookmarked', False)} "
          f"likes={p['likes_count']}")

# ============================================================================
# 13. 帖子详情 — 各自 is_liked / is_bookmarked 应正确
# ============================================================================
print(f"\n=== Step 12: user_a 看帖子{posts[0]} ===")
r = req("GET", f"/posts/{posts[0]}", headers=ha)
pp = r.json()
print(f"  title={pp['title']}")
print(f"  is_liked={pp['is_liked']}, is_bookmarked={pp['is_bookmarked']}")
print(f"  likes_count={pp['likes_count']}, bookmarks_count={pp['bookmarks_count']}")

# user_b 看同一个帖子
r = req("GET", f"/posts/{posts[0]}", headers=hb)
pp2 = r.json()
print(f"  (user_b) is_liked={pp2['is_liked']}, is_bookmarked={pp2['is_bookmarked']}")
assert pp2["is_liked"] == True       # user_b 点了赞
assert pp2["is_bookmarked"] == True  # user_b 收藏了

# ============================================================================
# 测试结果汇总
# ============================================================================
print("\n" + "="*50)
print("  全部流程测试通过！")
print("="*50)
print()
print("测试内容:")
print("  1. 分类 API — 初始空 → 发帖后计数")
print("  2. 发帖(技术/科学/生活) — 对话→保存→发帖")
print("  3. 点赞 — user_b → user_a 通知")
print("  4. 收藏 — user_b → user_a 通知")
print("  5. 评论 — user_b → user_a 通知")
print("  6. 通知列表 — 3条(like+bookmark+comment)")
print("  7. 未读数 → 全部已读 → 归零")
print("  8. 收藏列表 — user_b 可见")
print("  9. 个人主页 — 统计/帖子/is_liked/is_bookmarked")
print("  10. 帖子详情 — 各自 is_liked / is_bookmarked 正确")
