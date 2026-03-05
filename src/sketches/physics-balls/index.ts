import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createRenderer } from '@/lib/three/createRenderer'
import { handleResize } from '@/lib/three/resize'
import type { SketchModule } from '@/sketches'

const GRAVITY = -9.8
const RESTITUTION = 0.8
const FLOOR_Y = -10
const WALL = 15
const BALL_RADIUS = 0.6
const MAX_BALLS = 80
const DT = 1 / 60

type Ball = {
  mesh: THREE.Mesh
  vx: number
  vy: number
  vz: number
}

const sketch = (): SketchModule => {
  let renderer: THREE.WebGLRenderer
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let controls: OrbitControls
  let animationId: number
  let removeResize: () => void
  const balls: Ball[] = []
  let geometry: THREE.SphereGeometry

  const colors = [0x4fc3f7, 0xf06292, 0xffd54f, 0x81c784, 0xce93d8, 0xff8a65]

  const createBall = (x: number, y: number, z: number): Ball => {
    const material = new THREE.MeshStandardMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      roughness: 0.3,
      metalness: 0.4,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    scene.add(mesh)
    return { mesh, vx: (Math.random() - 0.5) * 4, vy: 0, vz: (Math.random() - 0.5) * 4 }
  }

  const onClick = (e: MouseEvent) => {
    if (balls.length >= MAX_BALLS) return
    const x = (Math.random() - 0.5) * 10
    const z = (Math.random() - 0.5) * 10
    balls.push(createBall(x, 15, z))
  }

  const init = (canvas: HTMLCanvasElement) => {
    renderer = createRenderer(canvas)
    renderer.shadowMap.enabled = true
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a2e)

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200)
    camera.position.set(0, 12, 30)
    controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 1)
    dir.position.set(10, 20, 10)
    dir.castShadow = true
    scene.add(dir)

    // Floor
    const floorGeo = new THREE.PlaneGeometry(WALL * 2, WALL * 2)
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2c2c54, roughness: 0.8 })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = FLOOR_Y
    floor.receiveShadow = true
    scene.add(floor)

    // Walls (transparent wireframe)
    const wallMat = new THREE.MeshBasicMaterial({ color: 0x444466, wireframe: true, transparent: true, opacity: 0.15 })
    const wallGeo = new THREE.BoxGeometry(WALL * 2, 30, WALL * 2)
    const wallMesh = new THREE.Mesh(wallGeo, wallMat)
    wallMesh.position.y = FLOOR_Y + 15
    scene.add(wallMesh)

    geometry = new THREE.SphereGeometry(BALL_RADIUS, 24, 24)

    // Initial balls
    for (let i = 0; i < 10; i++) {
      const x = (Math.random() - 0.5) * 16
      const y = Math.random() * 15 + 5
      const z = (Math.random() - 0.5) * 16
      balls.push(createBall(x, y, z))
    }

    removeResize = handleResize(renderer, camera)
    canvas.addEventListener('click', onClick)

    const animate = () => {
      animationId = requestAnimationFrame(animate)

      for (const ball of balls) {
        // Gravity
        ball.vy += GRAVITY * DT

        // Update position
        ball.mesh.position.x += ball.vx * DT
        ball.mesh.position.y += ball.vy * DT
        ball.mesh.position.z += ball.vz * DT

        // Floor collision
        if (ball.mesh.position.y - BALL_RADIUS < FLOOR_Y) {
          ball.mesh.position.y = FLOOR_Y + BALL_RADIUS
          ball.vy = -ball.vy * RESTITUTION
        }

        // Wall collisions
        if (Math.abs(ball.mesh.position.x) + BALL_RADIUS > WALL) {
          ball.mesh.position.x = Math.sign(ball.mesh.position.x) * (WALL - BALL_RADIUS)
          ball.vx = -ball.vx * RESTITUTION
        }
        if (Math.abs(ball.mesh.position.z) + BALL_RADIUS > WALL) {
          ball.mesh.position.z = Math.sign(ball.mesh.position.z) * (WALL - BALL_RADIUS)
          ball.vz = -ball.vz * RESTITUTION
        }
      }

      // Ball-to-ball collisions
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i]
          const b = balls[j]
          const dx = b.mesh.position.x - a.mesh.position.x
          const dy = b.mesh.position.y - a.mesh.position.y
          const dz = b.mesh.position.z - a.mesh.position.z
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
          const minDist = BALL_RADIUS * 2

          if (dist < minDist && dist > 0) {
            const nx = dx / dist
            const ny = dy / dist
            const nz = dz / dist

            // Separate
            const overlap = (minDist - dist) / 2
            a.mesh.position.x -= nx * overlap
            a.mesh.position.y -= ny * overlap
            a.mesh.position.z -= nz * overlap
            b.mesh.position.x += nx * overlap
            b.mesh.position.y += ny * overlap
            b.mesh.position.z += nz * overlap

            // Relative velocity along collision normal
            const dvx = a.vx - b.vx
            const dvy = a.vy - b.vy
            const dvz = a.vz - b.vz
            const dvDotN = dvx * nx + dvy * ny + dvz * nz

            if (dvDotN > 0) {
              const impulse = dvDotN * RESTITUTION
              a.vx -= impulse * nx
              a.vy -= impulse * ny
              a.vz -= impulse * nz
              b.vx += impulse * nx
              b.vy += impulse * ny
              b.vz += impulse * nz
            }
          }
        }
      }

      controls.update()
      renderer.render(scene, camera)
    }

    animate()
  }

  const dispose = () => {
    cancelAnimationFrame(animationId)
    removeResize?.()
    renderer?.domElement.removeEventListener('click', onClick)
    controls?.dispose()
    for (const ball of balls) {
      ball.mesh.geometry.dispose()
      ;(ball.mesh.material as THREE.Material).dispose()
    }
    geometry?.dispose()
    renderer?.dispose()
  }

  return { init, dispose }
}

export default sketch()
