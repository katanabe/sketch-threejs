import * as THREE from 'three'

export function handleResize(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera
): () => void {
  const onResize = () => {
    const width = window.innerWidth
    const height = window.innerHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }

  window.addEventListener('resize', onResize)

  return () => {
    window.removeEventListener('resize', onResize)
  }
}
