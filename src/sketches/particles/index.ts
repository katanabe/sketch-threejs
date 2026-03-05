import * as THREE from 'three'
import { createRenderer } from '@/lib/three/createRenderer'
import { handleResize } from '@/lib/three/resize'
import type { SketchModule } from '@/sketches'

const PARTICLE_COUNT = 100000

const sketch = (): SketchModule => {
  let renderer: THREE.WebGLRenderer
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let animationId: number
  let removeResize: () => void
  let points: THREE.Points
  const mouse = new THREE.Vector2(0, 0)

  const onMouseMove = (e: MouseEvent) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
  }

  const init = (canvas: HTMLCanvasElement) => {
    renderer = createRenderer(canvas)
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 50

    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const velocities = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * 100
      positions[i3 + 1] = (Math.random() - 0.5) * 100
      positions[i3 + 2] = (Math.random() - 0.5) * 100
      velocities[i3] = (Math.random() - 0.5) * 0.02
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
      size: 0.15,
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    })

    points = new THREE.Points(geometry, material)
    scene.add(points)

    removeResize = handleResize(renderer, camera)
    window.addEventListener('mousemove', onMouseMove)

    const animate = () => {
      animationId = requestAnimationFrame(animate)

      const posAttr = geometry.attributes.position as THREE.BufferAttribute
      const pos = posAttr.array as Float32Array

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3
        pos[i3] += velocities[i3]
        pos[i3 + 1] += velocities[i3 + 1]
        pos[i3 + 2] += velocities[i3 + 2]

        // Mouse influence
        const dx = mouse.x * 50 - pos[i3]
        const dy = mouse.y * 50 - pos[i3 + 1]
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 20) {
          velocities[i3] += dx * 0.00005
          velocities[i3 + 1] += dy * 0.00005
        }

        // Boundary wrap
        if (Math.abs(pos[i3]) > 50) pos[i3] *= -0.99
        if (Math.abs(pos[i3 + 1]) > 50) pos[i3 + 1] *= -0.99
        if (Math.abs(pos[i3 + 2]) > 50) pos[i3 + 2] *= -0.99
      }

      posAttr.needsUpdate = true
      points.rotation.y += 0.0005
      renderer.render(scene, camera)
    }

    animate()
  }

  const dispose = () => {
    cancelAnimationFrame(animationId)
    removeResize?.()
    window.removeEventListener('mousemove', onMouseMove)
    points?.geometry.dispose()
    ;(points?.material as THREE.Material).dispose()
    renderer?.dispose()
  }

  return { init, dispose }
}

export default sketch()
