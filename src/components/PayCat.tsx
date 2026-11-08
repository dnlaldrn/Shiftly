import { SendHorizontal, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { createCatScene } from '../lib/catScene'
import { reply } from '../lib/payHelp'
import { useCanvasScene } from '../lib/useCanvasScene'

const STILL_TIME = 1
const THINKING_MS = 450
const STARTERS = ['How is a regular holiday paid?', 'Magkano ang OT pag special holiday?', 'Paano kinukwenta ang night diff?']

export default function PayCat({ rate, currency }: { rate: number; currency: string }) {
  const mood = useRef({ talkFor: 0 })
  const create = useCallback((canvas: HTMLCanvasElement) => createCatScene(canvas, mood.current), [])
  const { canvasRef, failed } = useCanvasScene(create, STILL_TIME)
  const catButton = useRef<HTMLButtonElement>(null)
  const timer = useRef(0)

  const [open, setOpen] = useState(false)
  const [opened, setOpened] = useState(false)
  const [draft, setDraft] = useState('')
  const [asked, setAsked] = useState('')
  const [answer, setAnswer] = useState('')
  const [thinking, setThinking] = useState(false)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const say = (text: string) => {
    setAnswer(text)
    mood.current.talkFor = Math.min(5, 0.6 + text.length / 45)
  }

  const openChat = () => {
    setOpen(true)
    setOpened(true)
    if (!answer) say(reply('hi', rate, currency))
  }

  const closeChat = () => {
    setOpen(false)
    catButton.current?.focus()
  }

  const ask = (question: string) => {
    const text = question.trim()
    if (!text) return
    const response = reply(text, rate, currency)
    setAsked(text)
    setDraft('')
    setThinking(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setThinking(false)
      say(response)
    }, THINKING_MS)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    ask(draft)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) closeChat()
  }

  return (
    <aside className="pay-cat" aria-label="Pay helper" onKeyDown={onKeyDown}>
      {open && (
        <>
          <div className="cat-bubble">
            <div className="cat-bubble-text" aria-live="polite">
              {asked && <p className="cat-asked">“{asked}”</p>}
              {thinking ? <p className="cat-thinking" aria-hidden="true">• • •</p> : <p>{answer}</p>}
              {!asked && (
                <div className="cat-starters">
                  {STARTERS.map((starter) => (
                    <button key={starter} type="button" onClick={() => ask(starter)}>{starter}</button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="cat-close" aria-label="Close pay helper" onClick={closeChat}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <form className="cat-form" onSubmit={submit}>
            <input
              aria-label="Ask Mochi about your pay"
              placeholder="Ask about your pay…"
              maxLength={200}
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button className="primary icon-button" aria-label="Send" disabled={!draft.trim()}>
              <SendHorizontal size={18} aria-hidden="true" />
            </button>
          </form>
        </>
      )}
      <button
        ref={catButton}
        type="button"
        className="cat-button"
        aria-label={open ? 'Close pay helper' : 'Ask Mochi the cat about your pay'}
        aria-expanded={open}
        onClick={open ? closeChat : openChat}
      >
        {!opened && <span className="cat-hint" aria-hidden="true">Ask me about pay!</span>}
        {failed ? <span className="cat-fallback" aria-hidden="true">🐱</span> : <canvas ref={canvasRef} className="cat-canvas" aria-hidden="true" />}
      </button>
    </aside>
  )
}
