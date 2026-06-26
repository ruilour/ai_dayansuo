import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useStore } from '../store/useStore'

export function useAuth() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setAuth = useStore((s) => s.setAuth)
  const logout = useStore((s) => s.logout)

  const register = async (username, password, email, turnstileToken) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/register', {
        username,
        password,
        email: email || null,
        turnstile_token: turnstileToken,
      })
      setAuth(data.user, data.access_token, data.refresh_token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || '注册失败，请重试')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password, turnstileToken) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/login', {
        username,
        password,
        turnstile_token: turnstileToken,
      })
      setAuth(data.user, data.access_token, data.refresh_token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || '登录失败，请重试')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return { register, login, logout: handleLogout, loading, error }
}
