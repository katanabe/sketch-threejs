export type SketchModule = {
  init: (canvas: HTMLCanvasElement) => void
  dispose: () => void
}

export type Sketch = {
  slug: string
  title: string
  date: string
  description?: string
}

export const sketches: Sketch[] = [
  { slug: 'shader-waves', title: 'Shader Waves', date: '2026-03-05' },
  { slug: 'particles', title: 'Particles', date: '2026-03-01' },
  { slug: 'basic-scene', title: 'Basic Scene', date: '2026-02-20' },
]
