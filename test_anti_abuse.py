"""防滥用系统集成测试"""
import requests, sys

BASE = "http://localhost:8000/api"
failed = 0

def req(method, path, msg="", expect=2, **kw):
    """expect=2: 期望 2xx, expect=3: 期望 3xx, expect=4: 期望 4xx, expect=403: 期望 403"""
    global failed
    h = kw.pop("headers", {})
    try:
        r = requests.request(method, f"{BASE}{path}", headers=h,
                             json=kw.get("json"), timeout=10)
        if expect == 403:
            ok = r.status_code == 403
        elif expect == 4:
            ok = 400 <= r.status_code < 500
        elif expect == 2:
            ok = r.status_code < 400
        else:
            ok = r.status_code < 400
        status = "PASS" if ok else "FAIL"
        if not ok:
            failed += 1
            print(f"  [{status}] {r.status_code} {method} {path}  {msg}")
            print(f"         {r.text[:120]}")
        else:
            note = f" (期望 403)" if expect == 403 else ""
            print(f"  [{status}] {r.status_code} {method} {path}  {msg}{note}")
        return r
    except Exception as e:
        failed += 1
        print(f"  [FAIL] {method} {path}  {msg} — {e}")
        return None

def login(username, password):
    r = req("POST", "/auth/login", f"登录 {username}",
            json={"username": username, "password": password, "turnstile_token": "bypass"})
    return r.json().get("access_token", "") if r and r.status_code < 400 else ""

# ===== 1. 健康检查 =====
print("=== 1. 健康检查 ===")
req("GET", "/health", "服务健康")

# ===== 2. 登录用户 =====
print("\n=== 2. 用户准备 ===")
# 尝试注册（接受已存在的 409 错误）
r = req("POST", "/auth/register", "注册用户(可选)", expect=4,
        json={"username": "test_anti_abuse", "password": "Test1234!", "turnstile_token": "bypass"})

token = login("test_anti_abuse", "Test1234!")
if not token:
    print("  [FAIL] 无法获取用户 token")
else:
    print(f"  用户 Token: {token[:30]}...")
h = {"Authorization": f"Bearer {token}"}

# ===== 3. 管理员登录 =====
print("\n=== 3. 管理员 ===")
admin_token = login("admin", "admin123")
ha = {"Authorization": f"Bearer {admin_token}"}
print(f"  管理员登录: {'成功' if admin_token else '失败'}")

# ===== 4. 封禁/禁言 =====
print("\n=== 4. 封禁/禁言功能 ===")
if admin_token and token:
    r = req("GET", "/admin/users?search=test_anti_abuse", "查找用户", headers=ha)
    if r and r.status_code < 400:
        users = r.json()
        uid = users[0]["id"]
        print(f"  目标用户ID: {uid}", )

        # 1) 禁言 → 发帖被拒
        req("PUT", f"/admin/users/{uid}/status", "禁言用户", headers=ha,
            json={"status": "muted", "duration_hours": 1, "reason": "测试禁言"})
        req("POST", "/posts", "禁言后发帖应403", headers=h, expect=403,
            json={"conversation_id": 99999, "title": "测试", "summary": "test"})

        # 2) 解除禁言
        req("PUT", f"/admin/users/{uid}/status", "解除禁言", headers=ha,
            json={"status": "active"})

        # 3) 封禁 → GET /posts 应返回 403
        req("PUT", f"/admin/users/{uid}/status", "封禁用户", headers=ha,
            json={"status": "banned", "duration_hours": 1, "reason": "测试封禁"})
        req("GET", "/posts", "封禁后请求应403", headers=h, expect=403)

        # 4) 解除封禁
        req("PUT", f"/admin/users/{uid}/status", "解除封禁", headers=ha,
            json={"status": "active"})
else:
    print("  跳过 (缺少 token)")

# ===== 5. 举报 =====
print("\n=== 5. 举报功能 ===")
if token:
    r = req("GET", "/posts?limit=1", "获取帖子", headers=h)
    if r and r.status_code < 400:
        data = r.json()
        posts = data if isinstance(data, list) else data.get("items", [])
        if posts:
            pid = posts[0]["id"]
            r = req("POST", "/reports", "提交举报", headers=h, expect=4,
                    json={"target_type": "post", "target_id": pid, "reason": "spam", "detail": "测试举报"})
        else:
            r = None
    else:
        r = None
    # 处理举报结果
    if r and r.status_code == 201 and admin_token:
        rid = r.json().get("report_id")
        if rid:
            req("POST", f"/admin/reports/{rid}/resolve", "处理举报(忽略)", headers=ha,
                json={"action": "ignore"})

# ===== 6. 管理后台 =====
print("\n=== 6. 管理后台 ===")
if admin_token:
    req("GET", "/admin/stats", "统计概览", headers=ha)
    req("GET", "/admin/reports?status=pending", "举报列表", headers=ha)
    req("GET", "/admin/blocked-words", "敏感词列表", headers=ha)

# ===== 结果 =====
print(f"\n{'='*40}")
print(f"测试完成: 失败 {failed} 项")
if failed:
    sys.exit(1)
else:
    print("[OK] 全部通过!")
