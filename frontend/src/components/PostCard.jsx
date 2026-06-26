import { IconHeart, IconMessageCircle, IconUser } from './Icons'

export default function PostCard({ post }) {
  return (
    <div className="card p-5 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 flex flex-col h-full">
      <h3 className="font-display font-semibold line-clamp-2 mb-1.5" style={{ color: 'var(--color-text-primary)', fontSize: '1.0625rem' }}>
        {post.title}
      </h3>
      <p className="text-sm line-clamp-3 mb-4 flex-1" style={{ color: 'var(--color-text-body)' }}>
        {post.summary}
      </p>
      <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: '1px solid var(--color-surface-border)' }}>
        <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <IconUser className="icon" />
          {post.username || '用户'}
        </span>
        <div className="flex items-center gap-4" style={{ color: 'var(--color-text-placeholder)' }}>
          <span className="inline-flex items-center gap-1 text-xs">
            <IconHeart className="icon" />
            {post.likes_count || 0}
          </span>
          <span className="inline-flex items-center gap-1 text-xs">
            <IconMessageCircle className="icon" />
            {post.comments_count || 0}
          </span>
        </div>
      </div>
    </div>
  )
}
