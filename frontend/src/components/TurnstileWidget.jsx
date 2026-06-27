import { useEffect, useRef } from 'react'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA' // dev key

export default function TurnstileWidget({ onVerify, onExpire }) {
  const containerRef = useRef(null)
  const widgetId = useRef(null)

  useEffect(() => {
    // 等待 Turnstile SDK 加载
    const interval = setInterval(() => {
      if (window.turnstile && containerRef.current) {
        clearInterval(interval)
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => onVerify?.(token),
          'expired-callback': () => onExpire?.(),
        })
      }
    }, 200)

    // 加载 SDK（如果未加载）
    if (!document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    return () => {
      clearInterval(interval)
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current)
      }
    }
  }, [])

  return <div ref={containerRef} />
}
