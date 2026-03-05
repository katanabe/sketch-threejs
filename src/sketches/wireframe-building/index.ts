import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createRenderer } from '@/lib/three/createRenderer'
import { handleResize } from '@/lib/three/resize'
import type { SketchModule } from '@/sketches'

const BAY_WIDTH = 6
const FLOOR_HEIGHT = 4

const COLORS = {
  frame: 0x88ccff,
  bracing: 0x44ffaa,
  floorGrid: 0x334466,
  background: 0x0a0a14,
  handleX: 0xff4466,
  handleZ: 0x4488ff,
  handleY: 0xffcc44,
} as const

const ANIMATION_DURATION = 3

function buildStructure(floors: number, baysX: number, baysZ: number): {
  frameLines: THREE.LineSegments
  bracingLines: THREE.LineSegments
  floorGridLines: THREE.LineSegments
} {
  const framePositions: number[] = []
  const bracingPositions: number[] = []
  const floorGridPositions: number[] = []

  const originX = -(baysX * BAY_WIDTH) / 2
  const originZ = -(baysZ * BAY_WIDTH) / 2

  for (let floor = 0; floor <= floors; floor++) {
    const y = floor * FLOOR_HEIGHT

    if (floor < floors) {
      for (let ix = 0; ix <= baysX; ix++) {
        for (let iz = 0; iz <= baysZ; iz++) {
          const x = originX + ix * BAY_WIDTH
          const z = originZ + iz * BAY_WIDTH
          framePositions.push(x, y, z, x, y + FLOOR_HEIGHT, z)
        }
      }
    }

    if (floor > 0) {
      for (let ix = 0; ix < baysX; ix++) {
        for (let iz = 0; iz <= baysZ; iz++) {
          const x0 = originX + ix * BAY_WIDTH
          const x1 = originX + (ix + 1) * BAY_WIDTH
          const z = originZ + iz * BAY_WIDTH
          framePositions.push(x0, y, z, x1, y, z)
        }
      }
      for (let ix = 0; ix <= baysX; ix++) {
        for (let iz = 0; iz < baysZ; iz++) {
          const x = originX + ix * BAY_WIDTH
          const z0 = originZ + iz * BAY_WIDTH
          const z1 = originZ + (iz + 1) * BAY_WIDTH
          framePositions.push(x, y, z0, x, y, z1)
        }
      }
    }

    if (floor < floors) {
      const yTop = y + FLOOR_HEIGHT
      for (const iz of [0, baysZ]) {
        const z = originZ + iz * BAY_WIDTH
        for (let ix = 0; ix < baysX; ix++) {
          const x0 = originX + ix * BAY_WIDTH
          const x1 = originX + (ix + 1) * BAY_WIDTH
          bracingPositions.push(x0, y, z, x1, yTop, z)
          bracingPositions.push(x1, y, z, x0, yTop, z)
        }
      }
      for (const ix of [0, baysX]) {
        const x = originX + ix * BAY_WIDTH
        for (let iz = 0; iz < baysZ; iz++) {
          const z0 = originZ + iz * BAY_WIDTH
          const z1 = originZ + (iz + 1) * BAY_WIDTH
          bracingPositions.push(x, y, z0, x, yTop, z1)
          bracingPositions.push(x, y, z1, x, yTop, z0)
        }
      }
    }

    if (floor > 0) {
      const subdivisions = 3
      for (let ix = 0; ix < baysX; ix++) {
        for (let iz = 0; iz < baysZ; iz++) {
          const bx0 = originX + ix * BAY_WIDTH
          const bz0 = originZ + iz * BAY_WIDTH
          const step = BAY_WIDTH / subdivisions
          for (let s = 1; s < subdivisions; s++) {
            const z = bz0 + s * step
            floorGridPositions.push(bx0, y, z, bx0 + BAY_WIDTH, y, z)
          }
          for (let s = 1; s < subdivisions; s++) {
            const x = bx0 + s * step
            floorGridPositions.push(x, y, bz0, x, y, bz0 + BAY_WIDTH)
          }
        }
      }
    }
  }

  const frameGeom = new THREE.BufferGeometry()
  frameGeom.setAttribute('position', new THREE.Float32BufferAttribute(framePositions, 3))
  const frameLines = new THREE.LineSegments(
    frameGeom,
    new THREE.LineBasicMaterial({ color: COLORS.frame })
  )

  const bracingGeom = new THREE.BufferGeometry()
  bracingGeom.setAttribute('position', new THREE.Float32BufferAttribute(bracingPositions, 3))
  const bracingLines = new THREE.LineSegments(
    bracingGeom,
    new THREE.LineBasicMaterial({ color: COLORS.bracing, transparent: true, opacity: 0.5 })
  )

  const floorGridGeom = new THREE.BufferGeometry()
  floorGridGeom.setAttribute('position', new THREE.Float32BufferAttribute(floorGridPositions, 3))
  const floorGridLines = new THREE.LineSegments(
    floorGridGeom,
    new THREE.LineBasicMaterial({ color: COLORS.floorGrid, transparent: true, opacity: 0.3 })
  )

  return { frameLines, bracingLines, floorGridLines }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

const sketch = (): SketchModule => {
  let renderer: THREE.WebGLRenderer
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let controls: OrbitControls
  let animationId: number
  let removeResize: () => void
  let cleanupPointer: () => void
  let frameLines: THREE.LineSegments
  let bracingLines: THREE.LineSegments
  let floorGridLines: THREE.LineSegments
  let clock: THREE.Clock

  let floors = 8
  let baysX = 3
  let baysZ = 2

  const handleGeom = new THREE.SphereGeometry(0.8, 16, 12)
  let handleX: THREE.Mesh
  let handleZ: THREE.Mesh
  let handleY: THREE.Mesh

  let dragging: 'x' | 'z' | 'y' | null = null
  const dragPlane = new THREE.Plane()
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const intersection = new THREE.Vector3()

  let isInitialAnimation = true

  function setPointer(e: PointerEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  function disposeStructure() {
    if (!frameLines) return
    scene.remove(frameLines, bracingLines, floorGridLines)
    frameLines.geometry.dispose()
    ;(frameLines.material as THREE.Material).dispose()
    bracingLines.geometry.dispose()
    ;(bracingLines.material as THREE.Material).dispose()
    floorGridLines.geometry.dispose()
    ;(floorGridLines.material as THREE.Material).dispose()
  }

  function rebuildStructure() {
    disposeStructure()
    const structure = buildStructure(floors, baysX, baysZ)
    frameLines = structure.frameLines
    bracingLines = structure.bracingLines
    floorGridLines = structure.floorGridLines
    scene.add(frameLines, bracingLines, floorGridLines)
    updateHandlePositions()
  }

  function updateHandlePositions() {
    const halfW = (baysX * BAY_WIDTH) / 2
    const halfD = (baysZ * BAY_WIDTH) / 2
    const height = floors * FLOOR_HEIGHT

    handleX.position.set(halfW, height / 2, 0)
    handleZ.position.set(0, height / 2, halfD)
    handleY.position.set(0, height, 0)
  }

  const init = (canvas: HTMLCanvasElement) => {
    renderer = createRenderer(canvas)
    renderer.setClearColor(COLORS.background)

    scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(COLORS.background, 0.012)

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200)
    camera.position.set(30, 25, 35)

    controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.target.set(0, (floors * FLOOR_HEIGHT) / 2, 0)
    controls.update()

    // Ground grid
    const gridHelper = new THREE.GridHelper(60, 30, 0x334466, 0x1a1a2e)
    scene.add(gridHelper)

    // Build structure
    const structure = buildStructure(floors, baysX, baysZ)
    frameLines = structure.frameLines
    bracingLines = structure.bracingLines
    floorGridLines = structure.floorGridLines
    scene.add(frameLines, bracingLines, floorGridLines)

    // Initialize draw ranges to 0 for build-up animation
    frameLines.geometry.setDrawRange(0, 0)
    bracingLines.geometry.setDrawRange(0, 0)
    floorGridLines.geometry.setDrawRange(0, 0)

    // Create handles
    handleX = new THREE.Mesh(
      handleGeom,
      new THREE.MeshBasicMaterial({ color: COLORS.handleX })
    )
    handleZ = new THREE.Mesh(
      handleGeom,
      new THREE.MeshBasicMaterial({ color: COLORS.handleZ })
    )
    handleY = new THREE.Mesh(
      handleGeom,
      new THREE.MeshBasicMaterial({ color: COLORS.handleY })
    )
    updateHandlePositions()
    scene.add(handleX, handleZ, handleY)

    clock = new THREE.Clock()
    removeResize = handleResize(renderer, camera)

    // Pointer events
    const handles = [handleX, handleY, handleZ]

    const onPointerDown = (e: PointerEvent) => {
      setPointer(e, canvas)
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(handles)
      if (hits.length === 0) return

      const hit = hits[0].object
      if (hit === handleX) dragging = 'x'
      else if (hit === handleZ) dragging = 'z'
      else if (hit === handleY) dragging = 'y'
      else return

      controls.enabled = false

      if (dragging === 'x' || dragging === 'y') {
        dragPlane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 0, 1),
          hit.position
        )
      } else {
        dragPlane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(1, 0, 0),
          hit.position
        )
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      setPointer(e, canvas)
      raycaster.setFromCamera(pointer, camera)

      if (dragging) {
        if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
          let changed = false
          if (dragging === 'x') {
            const v = clamp(Math.round(intersection.x / BAY_WIDTH), 1, 8)
            if (v !== baysX) { baysX = v; changed = true }
          } else if (dragging === 'z') {
            const v = clamp(Math.round(intersection.z / BAY_WIDTH), 1, 6)
            if (v !== baysZ) { baysZ = v; changed = true }
          } else {
            const v = clamp(Math.round(intersection.y / FLOOR_HEIGHT), 1, 15)
            if (v !== floors) { floors = v; changed = true }
          }
          if (changed) {
            isInitialAnimation = false
            rebuildStructure()
          }
        }
        return
      }

      // Hover effect
      const hits = raycaster.intersectObjects(handles)
      const hovered = hits.length > 0 ? hits[0].object : null
      for (const h of handles) {
        h.scale.setScalar(h === hovered ? 1.3 : 1)
      }
      canvas.style.cursor = hovered ? 'pointer' : ''
    }

    const onPointerUp = () => {
      if (dragging) {
        dragging = null
        controls.enabled = true
      }
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)

    cleanupPointer = () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
    }

    const animate = () => {
      animationId = requestAnimationFrame(animate)

      if (isInitialAnimation) {
        const elapsed = clock.getElapsedTime()
        const progress = Math.min(elapsed / ANIMATION_DURATION, 1)
        const eased = 1 - Math.pow(1 - progress, 3)

        frameLines.geometry.setDrawRange(
          0, Math.floor(frameLines.geometry.attributes.position.count * eased)
        )
        bracingLines.geometry.setDrawRange(
          0, Math.floor(bracingLines.geometry.attributes.position.count * eased)
        )
        floorGridLines.geometry.setDrawRange(
          0, Math.floor(floorGridLines.geometry.attributes.position.count * eased)
        )

        if (progress >= 1) isInitialAnimation = false
      }

      controls.update()
      renderer.render(scene, camera)
    }

    animate()
  }

  const dispose = () => {
    cancelAnimationFrame(animationId)
    cleanupPointer?.()
    removeResize?.()
    controls?.dispose()
    disposeStructure()
    handleGeom.dispose()
    ;(handleX?.material as THREE.Material)?.dispose()
    ;(handleZ?.material as THREE.Material)?.dispose()
    ;(handleY?.material as THREE.Material)?.dispose()
    renderer?.dispose()
  }

  return { init, dispose }
}

export default sketch()
