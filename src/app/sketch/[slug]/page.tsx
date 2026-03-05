import { notFound } from 'next/navigation'
import { sketches } from '@/sketches'
import { SketchPage } from './SketchPage'

export function generateStaticParams() {
  return sketches.map((s) => ({ slug: s.slug }))
}

type Props = {
  params: Promise<{ slug: string }>
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const sketch = sketches.find((s) => s.slug === slug)
  if (!sketch) notFound()

  return <SketchPage slug={slug} title={sketch.title} />
}
