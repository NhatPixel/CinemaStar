import { refreshAccessToken } from './auth'
import {
  createAuthSessionExpiredError,
  redirectToLoginOnAuthFailure,
} from '../utils/authSession'

const explicitChatbotBase =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_CHATBOT_BASE_URL

const DEFAULT_CHATBOT_BASE =
  typeof import.meta !== 'undefined' && import.meta.env?.DEV
    ? '/chatbot'
    : 'http://cinema-api.duckdns.org:8000'

/**
 * Mặc định:
 * - dev: đi qua Vite proxy `/chatbot` để browser gửi cookie same-origin
 * - prod: gọi trực tiếp chatbot service
 * Override bằng VITE_CHATBOT_BASE_URL (không có `/chat`).
 */
function resolveChatUrl() {
  const base =
    typeof import.meta !== 'undefined' && import.meta.env?.DEV
      ? DEFAULT_CHATBOT_BASE
      : (explicitChatbotBase || DEFAULT_CHATBOT_BASE)
  const normalizedBase = base.replace(/\/$/, '')
  return `${normalizedBase}/chat`
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
  const url = resolveChatUrl()

  const headers = { 'Content-Type': 'application/json' }

  const body = { question }
  if (Array.isArray(history) && history.length > 0) {
    body.history = history
  }

  return fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
    signal,
  })
}

/**
 * Gửi câu hỏi tới chatbot (mặc định cinema-api:8000/chat).
 * Cookie browser được gửi trực tiếp bằng credentials: include.
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
      redirectToLoginOnAuthFailure()
      throw createAuthSessionExpiredError()
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
