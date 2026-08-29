export function AdminMenu({ label = 'Content options', onDelete, onReport }: { label?: string; onDelete?: () => void | Promise<void>;onReport?:()=>void|Promise<void> }) {
  if(!onDelete&&!onReport)return null;
  return <details className="admin-menu">
    <summary aria-label={label} title={label}>•••</summary>
    <div>{onReport&&<button type="button" onClick={(event)=>{event.preventDefault();void onReport();}}>Report</button>}{onDelete&&<button type="button" className="danger" onClick={(event) => { event.preventDefault(); void onDelete(); }}>Delete</button>}</div>
  </details>;
}
