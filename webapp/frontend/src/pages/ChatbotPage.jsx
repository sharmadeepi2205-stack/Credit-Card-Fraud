import { useState, useRef, useEffect } from 'react'
import api from '../api/client'
import { Send, Bot, User, Sparkles } from 'lucide-react'

const SUGGESTIONS = [
  'Was my last transaction safe?',
  'Why was my card flagged?',
  'Show my pending alerts',
  'How much have I spent recently?',
  'Give me security tips',
]

function Message({ msg }) {
  const isBot = msg.role === 'bot'
  return (
    <div className={`flex gap-3 ${isBot ? '' : 'flex-row-reverse'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        isBot ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
      }`}>
        {isBot ? <Bot size={16} className="text-white" /> : <User size={16} className="text-gray-600 dark:text-gray-200" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isBot
          ? 'bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 text-gray-800 dark:text-gray-100'
          : 'bg-blue-600 text-white'
      }`}>
        {/* Render markdown-lite: bold, bullets */}
        {msg.text.split('\n').map((line, i) => {
          const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          if (line.startsWith('•')) return (
            <div key={i} className="flex gap-2 mt-1">
              <span className="shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: bold.slice(1).trim() }} />
            </div>
          )
          return <p key={i} className={i > 0 ? 'mt-1' : ''} dangerouslySetInnerHTML={{ __html: bold }} />
        })}
        <p className="text-xs opacity-50 mt-2">{msg.time}</p>
      </div>
    </div>
  )
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState([{
    role: 'bot',
    text: "Hi! 👋 I'm your FraudGuard AI assistant. Ask me anything about your transactions, alerts, or card security.",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg) return
    setInput('')
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setMessages(m => [...m, { role: 'user', text: msg, time }])
    setLoading(true)
    try {
      const { data } = await api.post('/chat', { message: msg })
      setMessages(m => [...m, { role: 'bot', text: data.reply, time }])
    } catch {
      setMessages(m => [...m, { role: 'bot', text: "Sorry, I couldn't process that. Please try again.", time }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
          <Sparkles size={22} className="text-blue-500" /> AI Fraud Assistant
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Ask about your transactions, alerts, or card security in plain English
        </p>
      </div>

      {/* Chat window */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => <Message key={i} msg={m} />)}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
              <div className="flex gap-1 items-center h-5">
                {[0,1,2].map(i => (
                  <span key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="flex gap-2 flex-wrap mt-3">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)}
              className="text-xs bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-full hover:border-blue-400 hover:text-blue-600 transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={e => { e.preventDefault(); send() }} className="flex gap-3 mt-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about your transactions, alerts, or security…"
          disabled={loading}
          className="flex-1 border dark:border-gray-600 rounded-xl px-4 py-3 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
        <button type="submit" disabled={loading || !input.trim()}
          className="bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors">
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
