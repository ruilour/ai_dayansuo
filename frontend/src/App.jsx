import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import PostDetail from './pages/PostDetail'
import UserProfile from './pages/UserProfile'

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminReports = lazy(() => import('./pages/admin/AdminReports'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminBlockedWords = lazy(() => import('./pages/admin/AdminBlockedWords'))

function ProtectedRoute({ children }) {
  const token = useStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const token = useStore((s) => s.token)
  if (token) return <Navigate to="/" replace />
  return children
}

function AdminRoute({ children }) {
  const user = useStore((s) => s.user)
  const token = useStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/user/:id" element={<UserProfile />} />
          <Route path="/admin" element={<AdminRoute><Suspense fallback={<div className="p-8 text-center">加载中...</div>}><AdminDashboard /></Suspense></AdminRoute>} />
          <Route path="/admin/reports" element={<AdminRoute><Suspense fallback={<div className="p-8 text-center">加载中...</div>}><AdminReports /></Suspense></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><Suspense fallback={<div className="p-8 text-center">加载中...</div>}><AdminUsers /></Suspense></AdminRoute>} />
          <Route path="/admin/blocked-words" element={<AdminRoute><Suspense fallback={<div className="p-8 text-center">加载中...</div>}><AdminBlockedWords /></Suspense></AdminRoute>} />
        </Routes>
      </main>
    </div>
  )
}
