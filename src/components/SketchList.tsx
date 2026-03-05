import Link from 'next/link'
import { sketches } from '@/sketches'
import styles from './SketchList.module.css'

export function SketchList() {
  return (
    <ul className={styles.list}>
      {sketches.map((sketch) => (
        <li key={sketch.slug} className={styles.item}>
          <span className={styles.date}>{sketch.date}</span>
          <Link href={`/sketch/${sketch.slug}`} className={styles.link}>
            {sketch.title}
          </Link>
        </li>
      ))}
    </ul>
  )
}
