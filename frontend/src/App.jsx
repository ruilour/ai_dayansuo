import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import PostDetail from './pages/PostDetail'
import UserProfile from './pages/UserProfile'

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
        </Routes>
      </main>
    </div>
  )
}
