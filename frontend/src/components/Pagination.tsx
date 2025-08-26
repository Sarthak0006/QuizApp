import { Button } from "./ui/button";

export default function Pagination({
  page, pageSize, total, onChange
}: { page: number; pageSize: number; total: number; onChange: (p:number)=>void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center gap-2 justify-end">
      <Button variant="outline" size="sm" onClick={()=>onChange(Math.max(1, page-1))} disabled={page<=1}>Prev</Button>
      <span className="text-sm">Page {page} / {pages}</span>
      <Button variant="outline" size="sm" onClick={()=>onChange(Math.min(pages, page+1))} disabled={page>=pages}>Next</Button>
    </div>
  );
}
