import { USER_STORAGE_KEY } from '../api/user'

export const CHAT_MESSAGES_STORAGE_KEY = 'cinemaStarChatMessages'
export const CHAT_GUEST_USER_ID = '__guest__'
export const MAX_CHAT_MESSAGES = 100

export const CHAT_USER_CHANGED_EVENT = 'cinemastar-chat-user-changed'

export function getCurrentChatUserId() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    if (!raw) return CHAT_GUEST_USER_ID
    const user = JSON.parse(raw)
    const id = user?.id ?? user?.userId
    const normalized = id != null ? String(id).trim() : ''
    return normalized || CHAT_GUEST_USER_ID
  } catch {
    return CHAT_GUEST_USER_ID
  }
}

export function notifyChatUserChanged() {
  window.dispatchEvent(new CustomEvent(CHAT_USER_CHANGED_EVENT))
}

function normalizeMessage(raw) {
  if (!raw || typeof raw !== 'object') return null
  const content = String(raw.content || '').trim()
  if (!content) return null
  const role = raw.role === 'user' || raw.role === 'assistant' || raw.role === 'error'
    ? raw.role
    : 'assistant'
  return {
    id: String(raw.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
    role,
    content,
    createdAt: Number(raw.createdAt) || Date.now(),
  }
}

function readStore() {
  try {
    const raw = localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY)
    if (!raw) return { byUser: {} }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return { byUser: { [CHAT_GUEST_USER_ID]: parsed } }
    }
    if (parsed && typeof parsed === 'object' && parsed.byUser && typeof parsed.byUser === 'object') {
      return { byUser: parsed.byUser }
    }
    return { byUser: {} }
  } catch {
    return { byUser: {} }
  }
}

function writeStore(store) {
  localStorage.setItem(
    CHAT_MESSAGES_STORAGE_KEY,
    JSON.stringify({ version: 2, byUser: store.byUser }),
  )
}

export function loadChatMessages(userId = getCurrentChatUserId()) {
  const key = userId || CHAT_GUEST_USER_ID
  const store = readStore()
  const list = store.byUser[key]
  if (!Array.isArray(list)) return []
  return list.map(normalizeMessage).filter(Boolean)
}

export function saveChatMessages(messages, userId = getCurrentChatUserId()) {
  const key = userId || CHAT_GUEST_USER_ID
  const list = (Array.isArray(messages) ? messages : [])
    .map(normalizeMessage)
    .filter(Boolean)
    .slice(-MAX_CHAT_MESSAGES)

  const store = readStore()
  store.byUser[key] = list
  writeStore(store)
  return list
}

export function appendChatMessage(message, userId = getCurrentChatUserId()) {
  const next = normalizeMessage(message)
  if (!next) return loadChatMessages(userId)
  const current = loadChatMessages(userId)
  return saveChatMessages([...current, next], userId)
}

export function clearChatMessages(userId = getCurrentChatUserId()) {
  const key = userId || CHAT_GUEST_USER_ID
  const store = readStore()
  delete store.byUser[key]
  writeStore(store)
}
