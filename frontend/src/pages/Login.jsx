import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { IconFlask, IconLoader } from '../components/Icons'
import TurnstileWidget from '../components/TurnstileWidget'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [failedAttempts, setFailedAttempts] = useState(() => {
    return parseInt(localStorage.getItem('login_failed_attempts') || '0')
  })
  const [turnstileToken, setTurnstileToken] = useState('')
  const { login, loading, error } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (failedAttempts >= 3 && !turnstileToken) return
    try {
      await login(username, password, turnstileToken || 'dev-skip', failedAttempts < 3)
      localStorage.removeItem('login_failed_attempts')
    } catch {
      const newCount = failedAttempts + 1
      setFailedAttempts(newCount)
      localStorage.setItem('login_failed_attempts', String(newCount))
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
          <h1 className="heading-page">登录</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>欢迎回到 AI答研所</p>
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
              placeholder="请输入用户名"
              required
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
              placeholder="请输入密码"
              required
            />
          </div>

          {failedAttempts >= 3 && (
            <TurnstileWidget
              onVerify={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken('')}
            />
          )}

          <button
            type="submit"
            disabled={loading || (failedAttempts >= 3 && !turnstileToken)}
            className="btn-primary w-full text-sm"
          >
            {loading ? <IconLoader className="icon" /> : null}
            {loading ? '登录中...' : '登录'}
          </button>

          <p className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            还没有账号？{' '}
            <Link to="/register" style={{ color: 'var(--color-brand-600)' }} className="hover:underline">注册</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
