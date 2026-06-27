import { useState, useEffect } from 'react'
import api from '../../api'

const STATUS_OPTIONS = ['pending', 'resolved', 'dismissed']
const REASON_LABELS = { spam: '广告', abuse: '辱骂', porn: '色情', other: '其他' }

export default function AdminReports() {
  const [reports, setReports] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [loading, setLoading] = useState(true)

  const fetchReports = () => {
    setLoading(true)
    api.get(`/admin/reports?status=${statusFilter}`)
      .then(({ data }) => setReports(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchReports() }, [statusFilter])

  const handleResolve = async (reportId, action) => {
    const reason = prompt('处理原因（可选）：') || ''
    try {
      await api.post(`/admin/reports/${reportId}/resolve`, { action, reason })
      fetchReports()
    } catch (err) {
      alert(err.response?.data?.detail || '处理失败')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="heading-page mb-6">举报管理</h1>
      <div className="flex gap-2 mb-4">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={statusFilter === s ? 'btn-primary text-sm' : 'btn-ghost text-sm'}
          >
            {s === 'pending' ? '待处理' : s === 'resolved' ? '已处理' : '已忽略'}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>加载中...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>暂无举报</div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="card p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-medium">{REASON_LABELS[r.reason] || r.reason}</span>
                  <span className="text-sm ml-2" style={{ color: 'var(--color-text-muted)' }}>
                    {r.target_type === 'post' ? '帖子' : '评论'} #{r.target_id}
                  </span>
                </div>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{r.created_at}</span>
              </div>
              {r.detail && <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>{r.detail}</p>}
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>举报人: {r.reporter_name || r.reporter_id}</div>
              {statusFilter === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleResolve(r.id, 'dismiss')} className="btn-ghost text-xs">忽略</button>
                  <button onClick={() => handleResolve(r.id, 'delete')} className="btn-ghost text-xs" style={{ color: 'oklch(0.58 0.18 30)' }}>删除内容</button>
                  <button onClick={() => handleResolve(r.id, 'mute')} className="btn-ghost text-xs" style={{ color: 'oklch(0.6 0.15 70)' }}>禁言</button>
                  <button onClick={() => handleResolve(r.id, 'ban')} className="btn-ghost text-xs" style={{ color: 'oklch(0.5 0.2 30)' }}>封号</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
