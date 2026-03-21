import caMessages from '@/i18n/locales/ca.json'
import { trFactory } from '@/i18n/json-runtime'

const tr = trFactory(caMessages)

export function getBlogCopy() {
  return {
    eyebrow: tr('blog.eyebrow', 'Blog'),
    metaDescription: tr('blog.metaDescription', 'Articles i novetats de Summa Social.'),
    metaTitle: tr('blog.metaTitle', 'Blog | Summa Social'),
    notConfigured: tr('blog.notConfigured', "El blog no està configurat en aquest entorn."),
    title: tr('blog.title', 'Articles i novetats'),
  }
}
