import { permanentRedirect } from 'next/navigation'

// Conserva compatibilitat amb enllaços antics sense crear una segona URL indexable.
export default async function BlogPage() {
  permanentRedirect('/ca/blog')
}
