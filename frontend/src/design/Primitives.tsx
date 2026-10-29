import type { ReactNode } from "react";

export function PageIntro({ id, eyebrow, title, description, children }: { id?: string; eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <header className="page-intro"><div><p className="page-intro-eyebrow">{eyebrow}</p><h1 id={id}>{title}</h1><p className="page-intro-description">{description}</p></div>{children && <div className="page-intro-aside">{children}</div>}</header>;
}

export function CardSkeletons({ label }: { label: string }) {
  return <div className="design-skeleton-grid" role="status" aria-label={label}><span className="sr-only">{label}</span>{[0, 1, 2].map(value => <div className="design-skeleton" key={value} aria-hidden="true"><div /><span /><span /></div>)}</div>;
}
