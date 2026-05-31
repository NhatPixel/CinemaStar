import { getAuthCookieForForward } from '../utils/authCookieStorage'
import { refreshAccessToken } from './auth'

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
const explicitChatbotBase =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_CHATBOT_BASE_URL

/**
 * Dev (không set VITE_CHATBOT_BASE_URL): /chatbot/chat qua Vite proxy — browser gửi Cookie HttpOnly.
 * Prod / explicit URL: gửi auth_cookie trong body (header Cookie bị browser chặn cross-origin).
 */
function resolveChatConfig() {
  if (explicitChatbotBase) {
    const base = explicitChatbotBase.replace(/\/$/, '')
    return { url: `${base}/chat`, useProxy: false }
  }
  if (isDev) {
    return { url: '/chatbot/chat', useProxy: true }
  }
  return { url: 'http://localhost:8000/chat', useProxy: false }
}

function isUnauthorized(status, payload) {
  if (status === 401) return true
  if (payload && typeof payload === 'object') {
    const code = payload.code
    return code === 401 || code === '401'
  }
  return false
}

const CHAT_HISTORY_CONTEXT_LIMIT = 10

export function buildChatHistoryPayload(messages) {
  if (!Array.isArray(messages)) return []
  return messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .slice(-CHAT_HISTORY_CONTEXT_LIMIT)
    .map((m) => ({
      role: m.role,
      content: String(m.content || '').trim(),
    }))
    .filter((m) => m.content)
}

async function postChat(question, { signal, history } = {}) {
  const { url, useProxy } = resolveChatConfig()
  const authCookie = useProxy ? null : getAuthCookieForForward()

  const headers = { 'Content-Type': 'application/json' }

  const body = { question }
  if (Array.isArray(history) && history.length > 0) {
    body.history = history
  }
  if (!useProxy && authCookie) {
    body.auth_cookie = authCookie
  }

  return fetch(url, {
    method: 'POST',
    headers,
    credentials: useProxy ? 'include' : 'omit',
    body: JSON.stringify(body),
    signal,
  })
}

/**
 * Gửi câu hỏi tới chatbot.
 * Dev: /chatbot/chat + credentials (proxy chuyển cookie sang chatbot).
 * Prod: auth_cookie trong body nếu có trong localStorage.
 */
export async function sendChatMessage(question, { signal, history } = {}) {
  const q = String(question || '').trim()
  if (!q) {
    throw { status: 400, message: 'Câu hỏi không được để trống', raw: null }
  }

  async function attempt(retryAfterRefresh) {
    const response = await postChat(q, { signal, history })
    const contentType = response.headers.get('content-type') || ''
    let payload = null
    try {
      payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text()
    } catch {
      payload = null
    }

    if (!retryAfterRefresh && isUnauthorized(response.status, payload)) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        return attempt(true)
      }
    }

    if (payload && typeof payload === 'object' && payload.success === false) {
      throw {
        status: payload.code || response.status,
        message:
          payload.message ||
          payload.desc ||
          'Yêu cầu chatbot thất bại, vui lòng thử lại sau',
        code: payload.code,
        raw: payload,
      }
    }

    if (!response.ok) {
      throw {
        status: response.status,
        message:
          (payload && (payload.message || payload.desc)) ||
          'Yêu cầu chatbot thất bại, vui lòng thử lại sau',
        code: payload && payload.code,
        raw: payload,
      }
    }

    return payload
  }

  return attempt(false)
}
