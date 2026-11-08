import { useCallback } from 'react'
import { currencySymbol } from '../lib/format'
import { createMoneyScene } from '../lib/moneyScene'
import { useCanvasScene } from '../lib/useCanvasScene'

// Seconds of fall used for the single still frame under reduced motion, so the bills start spread out.
const STILL_TIME = 40

export default function MoneyRain({ currency }: { currency: string }) {
  const create = useCallback((canvas: HTMLCanvasElement) => createMoneyScene(canvas, currencySymbol(currency)), [currency])
  const { canvasRef, failed } = useCanvasScene(create, STILL_TIME)

  if (failed) return null
  return <canvas key={currency} ref={canvasRef} className="money-rain" aria-hidden="true" />
}
