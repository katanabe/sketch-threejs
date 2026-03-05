'use client'

import { useEffect, useRef } from 'react'
import type { SketchModule } from '@/sketches'
import styles from './SketchCanvas.module.css'

type Props = {
  load: () => Promise<SketchModule>
}

export function SketchCanvas({ load }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let sketch: SketchModule | null = null

    load().then((mod) => {
      sketch = mod
      sketch.init(canvas)
    })

    return () => {
      sketch?.dispose()
    }
  }, [load])

  return <canvas ref={canvasRef} className={styles.canvas} />
}
