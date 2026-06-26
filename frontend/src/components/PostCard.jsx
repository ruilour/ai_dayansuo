export default function PostCard({ post }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1">{post.title}</h3>
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{post.summary}</p>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{post.username || '用户'}</span>
        <div className="flex items-center gap-3">
          <span>👍 {post.likes_count || 0}</span>
          <span>💬 {post.comments_count || 0}</span>
        </div>
      </div>
    </div>
  )
}
