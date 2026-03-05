import Stats from 'three/examples/jsm/libs/stats.module.js'

export function createStats(): Stats {
  const stats = new Stats()
  stats.dom.style.position = 'absolute'
  stats.dom.style.top = '0px'
  stats.dom.style.left = '0px'
  document.body.appendChild(stats.dom)
  return stats
}

export function disposeStats(stats: Stats): void {
  if (stats.dom.parentElement) {
    stats.dom.parentElement.removeChild(stats.dom)
  }
}
