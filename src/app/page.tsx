import { SketchList } from '@/components/SketchList'
import styles from './page.module.css'

export default function Home() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>sketch-threejs</h1>
        <a
          href="https://github.com/katanabe/sketch-threejs"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.github}
        >
          GitHub
        </a>
      </header>
      <SketchList />
    </main>
  )
}
