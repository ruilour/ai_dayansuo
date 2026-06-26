import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-blue-600">AI答研所</Link>
        <div className="flex gap-4">
          <Link to="/" className="text-gray-600 hover:text-blue-600">首页</Link>
          <Link to="/login" className="text-gray-600 hover:text-blue-600">登录</Link>
        </div>
      </div>
    </nav>
  )
}
