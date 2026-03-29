import * as THREE from 'three'
import { createRenderer } from '@/lib/three/createRenderer'
import { handleResize } from '@/lib/three/resize'
import type { SketchModule } from '@/sketches'
import vertexShader from './vertex.glsl'
import fragmentShader from './fragment.glsl'

const sketch = (): SketchModule => {
  let renderer: THREE.WebGLRenderer
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let animationId: number
  let removeResize: () => void
  let material: THREE.ShaderMaterial
  let cleanupEvents: () => void

  const init = (canvas: HTMLCanvasElement) => {
    renderer = createRenderer(canvas)
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 0, 2.5)
    camera.lookAt(0, 0, 0)

    const texture = new THREE.TextureLoader().load('/images/cover.webp')
    texture.colorSpace = THREE.SRGBColorSpace

    const geometry = new THREE.PlaneGeometry(1.6, 0.9, 64, 64)

    material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uProgress: { value: 0 },
        uScale: { value: 1.0 },
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uTexture: { value: texture },
      },
      side: THREE.DoubleSide,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    removeResize = handleResize(renderer, camera)

    // --- Interaction ---
    // Phase 0: idle, Phase 1: folding, Phase 2: scaling up
    let folded = false
    let targetProgress = 0
    let currentProgress = 0
    let targetScale = 1
    let currentScale = 1

    const mouse = { x: 0, y: 0 }
    const smoothMouse = { x: 0, y: 0 }

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let isHovering = false

    // Calculate scale needed to fill screen
    const getFullscreenScale = () => {
      const fov = camera.fov * (Math.PI / 180)
      const dist = camera.position.z
      const visibleHeight = 2 * Math.tan(fov / 2) * dist
      const visibleWidth = visibleHeight * camera.aspect
      return Math.max(visibleWidth / 1.6, visibleHeight / 0.9) * 1.05
    }

    const onMouseMove = (e: MouseEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1

      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObject(mesh)
      isHovering = hits.length > 0

      if (isHovering) {
        mouse.x = pointer.x
        mouse.y = pointer.y
        canvas.style.cursor = 'pointer'
      } else {
        canvas.style.cursor = ''
      }
    }

    const onClick = () => {
      if (isHovering || folded) {
        folded = !folded
        if (folded) {
          targetProgress = 1
          targetScale = 1 // TODO: getFullscreenScale()
        } else {
          targetScale = 1
          targetProgress = 0
        }
      }
    }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('click', onClick)

    cleanupEvents = () => {
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('click', onClick)
    }

    const clock = new THREE.Clock()

    const animate = () => {
      animationId = requestAnimationFrame(animate)
      material.uniforms.uTime.value = clock.getElapsedTime()

      // Smooth fold progress
      currentProgress += (targetProgress - currentProgress) * 0.06
      material.uniforms.uProgress.value = currentProgress

      // Smooth scale (starts expanding as fold completes)
      if (folded) {
        // Only start scaling when fold is mostly done
        const scaleTarget = currentProgress > 0.8 ? targetScale : 1
        currentScale += (scaleTarget - currentScale) * 0.04
      } else {
        // When unfolding, shrink first then unfold
        currentScale += (targetScale - currentScale) * 0.08
      }
      material.uniforms.uScale.value = currentScale

      // Smooth mouse for hover wobble
      if (isHovering && !folded) {
        smoothMouse.x += (mouse.x - smoothMouse.x) * 0.1
        smoothMouse.y += (mouse.y - smoothMouse.y) * 0.1
      } else {
        smoothMouse.x *= 0.95
        smoothMouse.y *= 0.95
      }
      material.uniforms.uMouse.value.set(smoothMouse.x, smoothMouse.y)

      renderer.render(scene, camera)
    }

    animate()
  }

  const dispose = () => {
    cancelAnimationFrame(animationId)
    cleanupEvents?.()
    removeResize?.()
    renderer?.dispose()
    scene?.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose())
        } else {
          obj.material.dispose()
        }
      }
    })
  }

  return { init, dispose }
}

export default sketch()
