/* eslint-disable react-refresh/only-export-components -- hooks and helpers live beside the components that use them; hot reload of these few files is not worth splitting them */
// "How BlackBook works" — the knowledge base as pages (the website opens the
// SDK's dialog from its Advanced menu): a list of articles grouped as the
// articles say, and each article a page of its own over the list, with its
// sources. The articles are src/knowledge/, in every suite language.

import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { parseArticleBody, useLanguage } from '@unisim/sdk'
import { loadArticles } from '../knowledge'
import type { Article } from '../knowledge/types'
import { useT } from '../i18n'
import { LinkRow } from './TuneScreen'

export function useArticles(): Article[] | null {
  const { language } = useLanguage()
  const [articles, setArticles] = useState<Article[] | null>(null)
  useEffect(() => {
    let live = true
    void loadArticles(language).then((a) => {
      if (live) setArticles(a)
    })
    return () => {
      live = false
    }
  }, [language])
  return articles
}

export function KnowledgeList({ articles, onOpen }: { articles: Article[] | null; onOpen: (id: string) => void }) {
  const t = useT()
  if (!articles) return <p className="py-10 text-center text-slate-500">{t('loading')}</p>
  const groups: { name: string; items: Article[] }[] = []
  for (const a of articles) {
    const name = a.group ?? ''
    const last = groups[groups.length - 1]
    if (last && last.name === name) last.items.push(a)
    else groups.push({ name, items: [a] })
  }
  return (
    <>
      <p className="text-[15px] leading-relaxed text-slate-400">{t('kb_intro')}</p>
      {groups.map((g, i) => (
        <section key={i} className="bb-group">
          {g.name && <h2>{g.name}</h2>}
          <div className="bb-card">
            {g.items.map((a) => (
              <LinkRow key={a.id} label={a.title} note={a.summary} onClick={() => onOpen(a.id)} />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

export function ArticleBody({ article }: { article: Article }) {
  const t = useT()
  return (
    <article className="bb-article">
      <h1 className="bb-h1 mb-4">{article.title}</h1>
      {parseArticleBody(article.body).map((b, i) =>
        b.kind === 'h' ? (
          <h3 key={i}>{b.text}</h3>
        ) : b.kind === 'p' ? (
          <p key={i}>{bold(b.text)}</p>
        ) : b.kind === 'ul' ? (
          <ul key={i}>{b.items.map((x, j) => <li key={j}>{bold(x)}</li>)}</ul>
        ) : (
          <ol key={i}>{b.items.map((x, j) => <li key={j}>{bold(x)}</li>)}</ol>
        ),
      )}
      {article.sources && article.sources.length > 0 && (
        <>
          <h3>{t('kb_sources')}</h3>
          <ul>
            {article.sources.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noreferrer" className="text-orange-400 underline underline-offset-2">
                  {s.title}
                </a>
                {[s.publisher, s.year].filter(Boolean).length > 0 && (
                  <span className="text-slate-500"> · {[s.publisher, s.year].filter(Boolean).join(', ')}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  )
}

/** `**bold**` in an article's text, the one inline mark the articles use. */
function bold(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  )
}
