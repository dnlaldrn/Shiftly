import { useEffect, useRef, useState } from 'react'

export type CanvasScene = {
  resize(width: number, height: number): void
  render(seconds: number): void
  dispose(): void
}

// Animates only while the canvas is on screen; under reduced motion it draws one still frame at `stillTime` seconds.
export function useCanvasScene(create: (canvas: HTMLCanvasElement) => CanvasScene, stillTime: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let scene: CanvasScene
    try {
      scene = create(canvas)
    } catch {
      // Older devices without WebGL just go without the scene.
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
      if (still) scene.render(stillTime)
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
  }, [create, stillTime])

  return { canvasRef, failed }
}
