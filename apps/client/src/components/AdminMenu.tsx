export function AdminMenu({ label = 'Content options', onDelete, onReport,onMature,mature=false }: { label?: string; onDelete?: () => void | Promise<void>;onReport?:()=>void|Promise<void>;onMature?:()=>void|Promise<void>;mature?:boolean }) {
  if(!onDelete&&!onReport&&!onMature)return null;
  return <details className="admin-menu">
    <summary aria-label={label} title={label}>•••</summary>
    <div>{onMature&&<button type="button" onClick={(event)=>{event.preventDefault();void onMature();}}>{mature?'Remove Mature tag':'Mark Mature'}</button>}{onReport&&<button type="button" onClick={(event)=>{event.preventDefault();void onReport();}}>Report</button>}{onDelete&&<button type="button" className="danger" onClick={(event) => { event.preventDefault(); void onDelete(); }}>Delete</button>}</div>
  </details>;
}
