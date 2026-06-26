import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const user = useStore((s) => s.user)
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-gray-800 hover:text-gray-600">
            <span>🧪</span>
            <span>AI答研所</span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/chat"
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  💬 开始对话
                </Link>
                <span className="text-sm text-gray-600">{user.username}</span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                >
                  退出
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">登录</Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
