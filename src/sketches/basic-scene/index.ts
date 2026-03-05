import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createRenderer } from '@/lib/three/createRenderer'
import { handleResize } from '@/lib/three/resize'
import type { SketchModule } from '@/sketches'

const sketch = (): SketchModule => {
  let renderer: THREE.WebGLRenderer
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let controls: OrbitControls
  let animationId: number
  let removeResize: () => void

  const init = (canvas: HTMLCanvasElement) => {
    renderer = createRenderer(canvas)
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(3, 2, 3)

    controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true

    const geometry = new THREE.TorusKnotGeometry(1, 0.3, 128, 32)
    const material = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      metalness: 0.3,
      roughness: 0.4,
    })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    removeResize = handleResize(renderer, camera)

    const animate = () => {
      animationId = requestAnimationFrame(animate)
      mesh.rotation.y += 0.005
      mesh.rotation.x += 0.002
      controls.update()
      renderer.render(scene, camera)
    }

    animate()
  }

  const dispose = () => {
    cancelAnimationFrame(animationId)
    removeResize?.()
    controls?.dispose()
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
