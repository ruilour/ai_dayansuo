import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/stats')
      .then(({ data }) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--color-text-muted)' }}>加载中...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="heading-page mb-6">管理后台</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold">{stats?.pending_reports || 0}</div>
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>待处理举报</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>总用户</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: 'oklch(0.58 0.18 30)' }}>{stats?.banned_users || 0}</div>
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>已封禁</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: 'oklch(0.6 0.15 70)' }}>{stats?.muted_users || 0}</div>
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>已禁言</div>
        </div>
      </div>
      <div className="grid gap-4">
        <Link to="/admin/reports" className="card p-4 flex items-center justify-between hover:opacity-80">
          <span>举报管理</span>
          <span style={{ color: 'var(--color-text-muted)' }}>→</span>
        </Link>
        <Link to="/admin/users" className="card p-4 flex items-center justify-between hover:opacity-80">
          <span>用户管理</span>
          <span style={{ color: 'var(--color-text-muted)' }}>→</span>
        </Link>
        <Link to="/admin/blocked-words" className="card p-4 flex items-center justify-between hover:opacity-80">
          <span>敏感词管理</span>
          <span style={{ color: 'var(--color-text-muted)' }}>→</span>
        </Link>
      </div>
    </div>
  )
}
