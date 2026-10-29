export default function WorkspaceLoading({ label = "Cargando información…" }: { label?: string }) {
  return <div className="workspace-loading" role="status"><span className="sr-only">{label}</span>{[0, 1, 2].map(value => <div aria-hidden="true" key={value}><span /><span /><span /></div>)}</div>;
}
