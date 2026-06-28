import { create } from 'zustand'

const loadDraft = () => {
  try {
    const draft = localStorage.getItem('ai_dayansuo_draft')
    return draft ? JSON.parse(draft) : null
  } catch {
    return null
  }
}

const saveDraft = (state) => {
  try {
    localStorage.setItem('ai_dayansuo_draft', JSON.stringify(state))
  } catch { /* ignore */ }
}

const clearDraft = () => {
  localStorage.removeItem('ai_dayansuo_draft')
}

export const useStore = create((set, get) => {
  const draft = loadDraft()

  return {
    // === 用户 ===
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('access_token') || null,
    refreshToken: localStorage.getItem('refresh_token') || null,

    setAuth: (user, accessToken, refreshToken) => {
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
      set({ user, token: accessToken, refreshToken })
    },

    logout: () => {
      localStorage.removeItem('user')
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      clearDraft()
      set({ user: null, token: null, refreshToken: null, currentConversation: { id: null, messages: [], isSaved: false, roundCount: 0 } })
    },

    // === 当前对话 ===
    currentConversation: draft || { id: null, messages: [], isSaved: false, roundCount: 0 },

    setCurrentConversation: (conv) => {
      set({ currentConversation: conv })
      if (conv.messages.length > 0 && !conv.isSaved) {
        saveDraft(conv)
      } else {
        clearDraft()
      }
    },

    addMessage: (message) => {
      const conv = get().currentConversation
      const updated = { ...conv, messages: [...conv.messages, message], roundCount: message.role === 'user' ? conv.roundCount + 1 : conv.roundCount }
      set({ currentConversation: updated })
      if (!updated.isSaved) saveDraft(updated)
    },

    clearConversation: () => {
      clearDraft()
      set({ currentConversation: { id: null, messages: [], isSaved: false, roundCount: 0 } })
    },

    markConversationSaved: () => {
      const conv = get().currentConversation
      const updated = { ...conv, isSaved: true }
      set({ currentConversation: updated })
      clearDraft()
    },

    // === 已保存对话列表 ===
    savedConversations: [],
    selectedSavedId: null,

    setSavedConversations: (list) => set({ savedConversations: list }),
    setSelectedSavedId: (id) => set({ selectedSavedId: id }),
    sidebarRefreshKey: 0,
    triggerSidebarRefresh: () => set((s) => ({ sidebarRefreshKey: s.sidebarRefreshKey + 1 })),

    // === 广场 ===
    posts: [],
    postsPage: 1,
    postsHasMore: true,

    setPosts: (posts) => set({ posts }),
    appendPosts: (newPosts) => set((s) => ({ posts: [...s.posts, ...newPosts] })),
    setPostsPage: (page) => set({ postsPage: page }),
    setPostsHasMore: (hasMore) => set({ postsHasMore: hasMore }),

    // === 帖子详情 ===
    currentPost: null,
    comments: [],
    setCurrentPost: (post) => set({ currentPost: post }),
    setComments: (comments) => set({ comments }),

    // === 搜索 ===
    searchKeyword: '',
    searchResults: [],
    setSearchKeyword: (kw) => set({ searchKeyword: kw }),
    setSearchResults: (results) => set({ searchResults: results }),

    // === UI 状态 ===
    isStreaming: false,
    showShareModal: false,
    streamingContent: '',
    streamingReasoning: '',
    shareConversationId: null,

    setIsStreaming: (v) => set({ isStreaming: v }),
    setShowShareModal: (v) => set({ showShareModal: v }),
    setStreamingContent: (v) => set({ streamingContent: v }),
    setStreamingReasoning: (v) => set({ streamingReasoning: v }),
    appendStreamingContent: (text) => set((s) => ({ streamingContent: s.streamingContent + text })),
    appendStreamingReasoning: (text) => set((s) => ({ streamingReasoning: s.streamingReasoning + text })),
    resetStreaming: () => set({ streamingContent: '', streamingReasoning: '' }),
    setShareConversationId: (id) => set({ shareConversationId: id }),
  }
})
