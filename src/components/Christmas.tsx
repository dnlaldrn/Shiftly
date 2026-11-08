import { createChristmasScene } from '../lib/christmasScene'
import { useCanvasScene } from '../lib/useCanvasScene'

// Seconds into the scene used for the still frame under reduced motion, so the snow starts spread out.
const STILL_TIME = 30

// Sits behind the opaque cards, so it can never cover a figure or catch a tap.
export default function Christmas() {
  const { canvasRef, failed } = useCanvasScene(createChristmasScene, STILL_TIME)

  if (failed) return null
  return <canvas ref={canvasRef} className="christmas" aria-hidden="true" />
}
