import { useState, useEffect } from 'react'
import api from '../../api'

export default function AdminBlockedWords() {
  const [words, setWords] = useState([])
  const [pattern, setPattern] = useState('')
  const [isRegex, setIsRegex] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchWords = () => {
    setLoading(true)
    api.get('/admin/blocked-words')
      .then(({ data }) => setWords(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchWords() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!pattern.trim()) return
    try {
      await api.post('/admin/blocked-words', { pattern: pattern.trim(), is_regex: isRegex })
      setPattern('')
      setIsRegex(false)
      fetchWords()
    } catch (err) {
      alert(err.response?.data?.detail || '添加失败')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除？')) return
    try {
      await api.delete(`/admin/blocked-words/${id}`)
      fetchWords()
    } catch (err) {
      alert(err.response?.data?.detail || '删除失败')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="heading-page mb-6">敏感词管理</h1>
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="输入敏感词或正则"
          className="flex-1 px-3 py-2 outline-none text-sm rounded-lg"
          style={{
            border: '1px solid var(--color-surface-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-body)',
          }}
        />
        <label className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <input type="checkbox" checked={isRegex} onChange={(e) => setIsRegex(e.target.checked)} />
          正则
        </label>
        <button type="submit" className="btn-primary text-sm">添加</button>
      </form>
      {loading ? (
        <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>加载中...</div>
      ) : words.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>暂无敏感词</div>
      ) : (
        <div className="space-y-2">
          {words.map(w => (
            <div key={w.id} className="card p-3 flex items-center justify-between">
              <div>
                <code className="text-sm">{w.pattern}</code>
                {w.is_regex && <span className="text-xs ml-2" style={{ color: 'var(--color-brand-500)' }}>正则</span>}
              </div>
              <button onClick={() => handleDelete(w.id)} className="btn-ghost text-xs" style={{ color: 'oklch(0.58 0.18 30)' }}>删除</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
