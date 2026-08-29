export function AdminMenu({ label = 'Moderation options', onDelete }: { label?: string; onDelete: () => void | Promise<void> }) {
  return <details className="admin-menu">
    <summary aria-label={label} title={label}>•••</summary>
    <div><button type="button" className="danger" onClick={(event) => { event.preventDefault(); void onDelete(); }}>Delete</button></div>
  </details>;
}
