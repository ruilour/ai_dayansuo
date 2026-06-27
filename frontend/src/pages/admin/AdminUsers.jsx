import { useState, useEffect } from 'react'
import api from '../../api'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchUsers = (query = '') => {
    setLoading(true)
    api.get(`/admin/users?search=${encodeURIComponent(query)}`)
      .then(({ data }) => setUsers(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchUsers(search)
  }

  const handleStatusChange = async (userId, status, durationHours = null) => {
    const reason = prompt('原因（可选）：') || ''
    try {
      await api.put(`/admin/users/${userId}/status`, { status, duration_hours: durationHours, reason })
      fetchUsers(search)
    } catch (err) {
      alert(err.response?.data?.detail || '操作失败')
    }
  }

  const statusBadge = (status) => {
    const colors = { active: 'green', muted: 'orange', banned: 'red' }
    return <span style={{ color: `var(--color-${colors[status] || 'text-muted'})` }}>{status === 'active' ? '正常' : status === 'muted' ? '禁言' : '封禁'}</span>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="heading-page mb-6">用户管理</h1>
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索用户名..."
          className="flex-1 px-3 py-2 outline-none text-sm rounded-lg"
          style={{
            border: '1px solid var(--color-surface-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-body)',
          }}
        />
        <button type="submit" className="btn-primary text-sm">搜索</button>
      </form>
      {loading ? (
        <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>加载中...</div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="card p-3 flex items-center justify-between">
              <div>
                <span className="font-medium">{u.username}</span>
                <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>ID: {u.id}</span>
                <span className="text-xs ml-2">{statusBadge(u.status)}</span>
                {u.status_reason && <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>({u.status_reason})</span>}
              </div>
              <div className="flex gap-1">
                {u.status !== 'active' && (
                  <button onClick={() => handleStatusChange(u.id, 'active')} className="btn-ghost text-xs">解封</button>
                )}
                {u.status === 'active' && (
                  <>
                    <button onClick={() => handleStatusChange(u.id, 'muted', 24)} className="btn-ghost text-xs" style={{ color: 'oklch(0.6 0.15 70)' }}>禁言24h</button>
                    <button onClick={() => handleStatusChange(u.id, 'banned')} className="btn-ghost text-xs" style={{ color: 'oklch(0.5 0.2 30)' }}>封号</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
