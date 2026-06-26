import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useAuth } from '../hooks/useAuth'
import { IconFlask, IconGlobe, IconMessageSquare, IconUser, IconLogOut } from './Icons'

export default function Navbar() {
  const user = useStore((s) => s.user)
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="sticky top-0 z-50" style={{ backgroundColor: 'var(--color-surface-card)', borderBottom: '1px solid var(--color-surface-border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-display font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              <IconFlask className="icon-lg" style={{ color: 'var(--color-brand-500)' }} />
              <span>AI答研所</span>
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseOver={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
              onMouseOut={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
            >
              <IconGlobe />
              广场
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/chat"
                  className="btn-primary text-sm"
                >
                  <IconMessageSquare className="icon" />
                  开始对话
                </Link>
                <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <IconUser className="icon" />
                  {user.username}
                </span>
                <button
                  onClick={logout}
                  className="btn-ghost text-sm"
                >
                  <IconLogOut className="icon" />
                  退出
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm">登录</Link>
                <Link to="/register" className="btn-primary text-sm">注册</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
