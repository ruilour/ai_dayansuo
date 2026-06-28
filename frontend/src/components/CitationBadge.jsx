function CitationBadge({ citations }) {
  if (!citations || citations.length === 0) return null;
  return (
    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
        📚 参考来源
      </p>
      <div className="flex flex-wrap gap-2">
        {citations.map((c, i) => (
          <a
            key={i}
            href={`/post/${c.post_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30
                       text-blue-700 dark:text-blue-300 text-xs rounded-full
                       hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
            {c.title}
            <span className="text-gray-400">·</span>
            <span className="text-gray-500 dark:text-gray-400">{c.username}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default CitationBadge;
