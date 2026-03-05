import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createRenderer } from '@/lib/three/createRenderer'
import { handleResize } from '@/lib/three/resize'
import type { SketchModule } from '@/sketches'
import vertexShader from './vertex.glsl'
import fragmentShader from './fragment.glsl'

const sketch = (): SketchModule => {
  let renderer: THREE.WebGLRenderer
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let controls: OrbitControls
  let animationId: number
  let removeResize: () => void
  let material: THREE.ShaderMaterial

  const init = (canvas: HTMLCanvasElement) => {
    renderer = createRenderer(canvas)
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 3, 5)

    controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true

    const geometry = new THREE.PlaneGeometry(8, 8, 128, 128)

    material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: 0.3 },
        uFrequency: { value: 3.0 },
      },
      side: THREE.DoubleSide,
      wireframe: true,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI * 0.5
    scene.add(mesh)

    removeResize = handleResize(renderer, camera)

    const clock = new THREE.Clock()

    const animate = () => {
      animationId = requestAnimationFrame(animate)
      material.uniforms.uTime.value = clock.getElapsedTime()
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
