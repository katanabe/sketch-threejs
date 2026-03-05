import * as THREE from 'three'
import { createRenderer } from '@/lib/three/createRenderer'
import { handleResize } from '@/lib/three/resize'
import type { SketchModule } from '@/sketches'

const ORB_COUNT = 6
const TRAIL_LENGTH = 200

type Orb = {
  mesh: THREE.Mesh
  trail: THREE.Line
  trailPositions: Float32Array
  freqX: number
  freqY: number
  phaseX: number
  phaseY: number
  ampX: number
  ampY: number
}

const sketch = (): SketchModule => {
  let renderer: THREE.WebGLRenderer
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let animationId: number
  let removeResize: () => void
  const orbs: Orb[] = []

  const palette = [0x4fc3f7, 0xf06292, 0xffd54f, 0x81c784, 0xce93d8, 0xff8a65]

  const init = (canvas: HTMLCanvasElement) => {
    renderer = createRenderer(canvas)
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0d0d1a)

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200)
    camera.position.set(0, 0, 30)

    // Ambient light
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(5, 10, 5)
    scene.add(dir)

    for (let i = 0; i < ORB_COUNT; i++) {
      const color = palette[i % palette.length]

      // Orb mesh
      const geo = new THREE.SphereGeometry(0.25, 16, 16)
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.4,
        roughness: 0.2,
        metalness: 0.6,
      })
      const mesh = new THREE.Mesh(geo, mat)
      scene.add(mesh)

      // Trail line
      const trailPositions = new Float32Array(TRAIL_LENGTH * 3)
      const trailGeo = new THREE.BufferGeometry()
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3))
      trailGeo.setDrawRange(0, 0)
      const trailMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 })
      const trail = new THREE.Line(trailGeo, trailMat)
      scene.add(trail)

      // Lissajous parameters — each orb gets different freq/phase
      orbs.push({
        mesh,
        trail,
        trailPositions,
        freqX: 1 + i * 0.4,
        freqY: 1.5 + i * 0.3,
        phaseX: (i * Math.PI) / ORB_COUNT,
        phaseY: (i * Math.PI) / (ORB_COUNT * 0.7),
        ampX: 6 + i * 1.2,
        ampY: 5 + i * 0.8,
      })
    }

    removeResize = handleResize(renderer, camera)

    let frame = 0
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      frame++

      const t = frame * 0.015

      for (const orb of orbs) {
        const x = Math.sin(orb.freqX * t + orb.phaseX) * orb.ampX
        const y = Math.cos(orb.freqY * t + orb.phaseY) * orb.ampY
        const z = Math.sin((orb.freqX + orb.freqY) * 0.5 * t) * 3

        orb.mesh.position.set(x, y, z)

        // Shift trail positions back
        for (let j = (TRAIL_LENGTH - 1) * 3; j >= 3; j -= 3) {
          orb.trailPositions[j] = orb.trailPositions[j - 3]
          orb.trailPositions[j + 1] = orb.trailPositions[j - 2]
          orb.trailPositions[j + 2] = orb.trailPositions[j - 1]
        }
        orb.trailPositions[0] = x
        orb.trailPositions[1] = y
        orb.trailPositions[2] = z

        const attr = orb.trail.geometry.attributes.position as THREE.BufferAttribute
        attr.needsUpdate = true
        const drawCount = Math.min(frame, TRAIL_LENGTH)
        orb.trail.geometry.setDrawRange(0, drawCount)
      }

      // Slow camera orbit
      camera.position.x = Math.sin(t * 0.1) * 5
      camera.position.z = 25 + Math.cos(t * 0.1) * 5
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }

    animate()
  }

  const dispose = () => {
    cancelAnimationFrame(animationId)
    removeResize?.()
    for (const orb of orbs) {
      orb.mesh.geometry.dispose()
      ;(orb.mesh.material as THREE.Material).dispose()
      orb.trail.geometry.dispose()
      ;(orb.trail.material as THREE.Material).dispose()
    }
    renderer?.dispose()
  }

  return { init, dispose }
}

export default sketch()
