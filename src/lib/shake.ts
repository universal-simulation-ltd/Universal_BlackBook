// Shake to clear the done to-dos (James, 2026-11-18). The browser's
// devicemotion events, read on the device; nothing is kept or sent.
//
// iOS asks before a page may read motion, and only from inside a tap
// (`DeviceMotionEvent.requestPermission`). Tune's switch asks as it is turned
// on; after that, each launch asks again quietly on the first tap anywhere —
// already allowed, it answers at once with no prompt — because the web view
// does not always remember from one launch to the next.

type MotionPermission = { requestPermission?: () => Promise<'granted' | 'denied'> }

const motion = () => (typeof DeviceMotionEvent === 'undefined' ? null : (DeviceMotionEvent as unknown as MotionPermission))

/** Ask to read motion (inside a tap). True where nothing needs asking. */
export async function askForMotion(): Promise<boolean> {
  const m = motion()
  if (!m) return false
  if (!m.requestPermission) return true
  try {
    return (await m.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

/** A good hard shake: three jolts within a second. */
const JOLT = 22 // m/s², change between readings
const JOLTS = 3
const WINDOW = 1000
const REST = 1500

/** Call `onShake` on each shake until the returned function is called. */
export function listenForShake(onShake: () => void): () => void {
  if (!motion()) return () => {}
  let last: { x: number; y: number; z: number } | null = null
  let jolts: number[] = []
  let quietUntil = 0
  const onMotion = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity
    if (!a || a.x == null || a.y == null || a.z == null) return
    const now = performance.now()
    if (last && now >= quietUntil) {
      const d = Math.abs(a.x - last.x) + Math.abs(a.y - last.y) + Math.abs(a.z - last.z)
      if (d > JOLT) {
        jolts = [...jolts.filter((t) => now - t < WINDOW), now]
        if (jolts.length >= JOLTS) {
          jolts = []
          quietUntil = now + REST
          onShake()
        }
      }
    }
    last = { x: a.x, y: a.y, z: a.z }
  }
  // Listening costs nothing until motion is allowed: no events come.
  window.addEventListener('devicemotion', onMotion)
  // Where it has to be asked, the first tap asks (quietly, if already allowed).
  const onTap = motion()?.requestPermission ? () => void askForMotion() : null
  if (onTap) document.addEventListener('touchend', onTap, { once: true, capture: true })
  return () => {
    window.removeEventListener('devicemotion', onMotion)
    if (onTap) document.removeEventListener('touchend', onTap, { capture: true })
  }
}
