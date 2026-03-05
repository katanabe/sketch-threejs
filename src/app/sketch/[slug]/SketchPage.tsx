'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { SketchCanvas } from '@/components/SketchCanvas'
import type { SketchModule } from '@/sketches'
import styles from './SketchPage.module.css'

type Props = {
  slug: string
  title: string
}

export function SketchPage({ slug, title }: Props) {
  const load = useCallback(
    () => import(`@/sketches/${slug}/index`).then((m) => m.default as SketchModule),
    [slug]
  )

  return (
    <>
      <SketchCanvas load={load} />
      <nav className={styles.nav}>
        <Link href="/" className={styles.back}>
          ← Back
        </Link>
        <span className={styles.title}>{title}</span>
      </nav>
    </>
  )
}
