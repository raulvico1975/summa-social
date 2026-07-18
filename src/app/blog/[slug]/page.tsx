import { permanentRedirect } from 'next/navigation'

// Conserva els enllaços antics i concentra l'autoritat a la ruta catalana canònica.
type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  permanentRedirect(`/ca/blog/${slug}`)
}
