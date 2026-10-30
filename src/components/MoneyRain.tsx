import { useEffect, useRef, useState } from 'react'
import { currencySymbol } from '../lib/format'
import { createMoneyScene } from '../lib/moneyScene'

// Seconds of fall used for the single still frame under reduced motion, so the bills start spread out.
const STILL_TIME = 40

export default function MoneyRain({ currency }: { currency: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let scene: ReturnType<typeof createMoneyScene>
    try {
      scene = createMoneyScene(canvas, currencySymbol(currency))
    } catch {
      // Older devices without WebGL just go without the rain.
      setFailed(true)
      return
    }

    let frame = 0
    let onScreen = true
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw)
      scene.render(now / 1000)
    }
    const updateLoop = () => {
      cancelAnimationFrame(frame)
      if (onScreen && !document.hidden) frame = requestAnimationFrame(draw)
    }

    const sizes = new ResizeObserver(() => {
      if (canvas.clientWidth === 0) return
      scene.resize(canvas.clientWidth, canvas.clientHeight)
      if (still) scene.render(STILL_TIME)
    })
    sizes.observe(canvas)

    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      updateLoop()
    })
    const lost = () => {
      cancelAnimationFrame(frame)
      setFailed(true)
    }
    canvas.addEventListener('webglcontextlost', lost)

    if (!still) {
      visibility.observe(canvas)
      document.addEventListener('visibilitychange', updateLoop)
    }

    return () => {
      cancelAnimationFrame(frame)
      sizes.disconnect()
      visibility.disconnect()
      document.removeEventListener('visibilitychange', updateLoop)
      canvas.removeEventListener('webglcontextlost', lost)
      scene.dispose()
    }
  }, [currency])

  if (failed) return null
  return <canvas key={currency} ref={canvasRef} className="money-rain" aria-hidden="true" />
}
