import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { IconFlask, IconLoader } from '../components/Icons'
import TurnstileWidget from '../components/TurnstileWidget'

export default function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileKey, setTurnstileKey] = useState(0)
  const { register, loading, error } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!turnstileToken) return
    try {
      await register(username, password, email, turnstileToken)
    } catch {
      // 重置 Turnstile：通过 key 变化强制重新挂载组件
      setTurnstileKey(k => k + 1)
      setTurnstileToken('')
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-in">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-brand-50)' }}>
              <IconFlask className="icon-lg" style={{ width: 28, height: 28, color: 'var(--color-brand-500)' }} />
            </div>
          </div>
          <h1 className="heading-page">注册</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>加入 AI答研所，开始探索</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="text-sm rounded-lg px-3 py-2" style={{ backgroundColor: 'oklch(0.58 0.18 30 / 0.1)', color: 'oklch(0.58 0.18 30)' }}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 outline-none text-sm transition-all duration-150 rounded-lg"
              style={{
                border: '1px solid var(--color-surface-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-body)',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--color-brand-500)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--color-surface-border)'}
              placeholder="2-50个字符"
              required
              minLength={2}
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 outline-none text-sm transition-all duration-150 rounded-lg"
              style={{
                border: '1px solid var(--color-surface-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-body)',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--color-brand-500)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--color-surface-border)'}
              placeholder="至少6个字符"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>邮箱（可选）</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 outline-none text-sm transition-all duration-150 rounded-lg"
              style={{
                border: '1px solid var(--color-surface-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-body)',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--color-brand-500)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--color-surface-border)'}
              placeholder="用于找回密码"
            />
          </div>

          <TurnstileWidget
            key={turnstileKey}
            onVerify={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken('')}
          />

          <button
            type="submit"
            disabled={loading || !turnstileToken}
            className="btn-primary w-full text-sm"
          >
            {loading ? <IconLoader className="icon" /> : null}
            {loading ? '注册中...' : '注册'}
          </button>

          <p className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            已有账号？{' '}
            <Link to="/login" style={{ color: 'var(--color-brand-600)' }} className="hover:underline">登录</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
