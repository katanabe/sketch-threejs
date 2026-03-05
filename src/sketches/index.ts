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
  { slug: 'unit-circle', title: 'Unit Circle', date: '2026-03-05' },
  { slug: 'wireframe-building', title: 'Wireframe Building', date: '2026-03-05' },
  { slug: 'physics-balls', title: 'Physics Balls', date: '2026-03-05' },
  { slug: 'trig-motion', title: 'Trig Motion', date: '2026-03-05' },
  { slug: 'shader-waves', title: 'Shader Waves', date: '2026-03-05' },
  { slug: 'particles', title: 'Particles', date: '2026-03-01' },
  { slug: 'basic-scene', title: 'Basic Scene', date: '2026-02-20' },
]
