import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { buildChatHistoryPayload, sendChatMessage } from '../../api/chatbot'
import {
  CHAT_USER_CHANGED_EVENT,
  clearChatMessages,
  getCurrentChatUserId,
  loadChatMessages,
  MAX_CHAT_MESSAGES,
  saveChatMessages,
} from '../../utils/chatMessageStorage'
import { Icon } from '..'
import BotBubbleIcon from './BotBubbleIcon'

function formatTime(timestamp) {
  try {
    return new Date(timestamp).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

const HIDDEN_CHAT_PATHS = new Set(['/login', '/register', '/forgot-password'])

function ChatWidget() {
  const { pathname } = useLocation()
  const hideChat = HIDDEN_CHAT_PATHS.has(pathname)

  const [open, setOpen] = useState(false)
  const [chatUserId, setChatUserId] = useState(() => getCurrentChatUserId())
  const [messages, setMessages] = useState(() => loadChatMessages())
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  const syncMessagesForCurrentUser = useCallback(() => {
    const id = getCurrentChatUserId()
    setChatUserId(id)
    setMessages(loadChatMessages(id))
  }, [])

  useEffect(() => {
    const onUserChanged = () => syncMessagesForCurrentUser()
    const onStorage = (e) => {
      if (e.key === 'currentUser') onUserChanged()
    }
    window.addEventListener(CHAT_USER_CHANGED_EVENT, onUserChanged)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(CHAT_USER_CHANGED_EVENT, onUserChanged)
      window.removeEventListener('storage', onStorage)
    }
  }, [syncMessagesForCurrentUser])

  useEffect(() => {
    if (hideChat) setOpen(false)
  }, [hideChat])

  useEffect(() => {
    saveChatMessages(messages, chatUserId)
  }, [messages, chatUserId])

  function pushMessage(list, message) {
    return [...list, message].slice(-MAX_CHAT_MESSAGES)
  }

  useEffect(() => {
    if (!open) return
    const el = listRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
    inputRef.current?.focus()
  }, [open, messages, sending])

  async function handleSend(e) {
    e?.preventDefault?.()
    const text = input.trim()
    if (!text || sending) return

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: Date.now(),
    }

    setMessages((prev) => pushMessage(prev, userMessage))
    setInput('')
    setSending(true)

    const history = buildChatHistoryPayload(messages)

    try {
      const result = await sendChatMessage(text, { history })
      const answer = String(result?.answer || '').trim() || 'Xin lỗi, tôi chưa có câu trả lời.'
      setMessages((prev) =>
        pushMessage(prev, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: answer,
          createdAt: Date.now(),
        }),
      )
    } catch (err) {
      const message =
        err?.message ||
        'Yêu cầu chatbot thất bại, vui lòng thử lại sau'
      setMessages((prev) =>
        pushMessage(prev, {
          id: `error-${Date.now()}`,
          role: 'error',
          content: message,
          createdAt: Date.now(),
        }),
      )
    } finally {
      setSending(false)
    }
  }

  function handleClearHistory() {
    clearChatMessages(chatUserId)
    setMessages([])
  }

  if (hideChat) {
    return null
  }

  return (
    <>
      {open && (
        <div
          className="fixed bottom-24 right-4 z-[60] flex w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-primary/30 bg-background-dark shadow-2xl shadow-primary/20"
          role="dialog"
          aria-label="Chat hỗ trợ CinemaStar"
        >
          <div className="flex items-center justify-between gap-2 border-b border-primary/20 bg-primary/10 px-4 py-3">
            <div>
              <p className="font-display text-sm font-bold text-white">CinemaStar Assistant</p>
              <p className="text-xs text-slate-400">Nhân viên hỗ trợ trực tuyến</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearHistory}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                title="Xóa lịch sử chat"
                aria-label="Xóa lịch sử chat"
              >
                <Icon name="delete_sweep" className="text-lg" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="Đóng chat"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>
          </div>

          <div
            ref={listRef}
            className="flex max-h-[min(60vh,420px)] min-h-[280px] flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
          >
            {messages.length === 0 && (
              <p className="text-center text-sm text-slate-500">
                Xin chào! Bạn cần hỗ trợ gì về phim, suất chiếu, khuyến mãi hay đặt vé?
              </p>
            )}
            {messages.map((msg) => {
              const isUser = msg.role === 'user'
              const isError = msg.role === 'error'
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      isUser
                        ? 'rounded-br-md bg-primary text-white'
                        : isError
                          ? 'rounded-bl-md border border-red-500/40 bg-red-950/40 text-red-200'
                          : 'rounded-bl-md border border-slate-700 bg-slate-800/80 text-slate-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        isUser ? 'text-white/70' : 'text-slate-500'
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-400">
                  Đang trả lời...
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={handleSend}
            className="flex gap-2 border-t border-primary/20 bg-slate-900/50 p-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi..."
              disabled={sending}
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-primary focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Gửi tin nhắn"
            >
              <Icon name="send" className="text-lg" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 transition hover:scale-105 hover:bg-primary/90 active:scale-95"
        aria-label={open ? 'Thu gọn chat' : 'Mở trợ lý AI CinemaStar'}
        aria-expanded={open}
      >
        {open ? (
          <Icon name="close" className="text-2xl" />
        ) : (
          <BotBubbleIcon className="h-8 w-8" />
        )}
      </button>
    </>
  )
}

export default ChatWidget
