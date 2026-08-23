"use client";

import { useEffect, useState } from "react";
import { Mail, MoreVertical, Plus, RefreshCcw, ShieldCheck, UserX } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { AdminAlert, AdminButton, AdminCard, AdminEmptyState, AdminPage, AdminPageHeader, adminUi } from "@/components/admin/AdminUI";

type Administrator = { id:number; firstName:string; lastName:string; email:string; role:string; status:string; passwordConfigured:boolean; lastLogin:string; invitedAt:string };

export function AdministratorsSettings() {
  const [items, setItems] = useState<Administrator[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<number | "invite" | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ firstName:"", lastName:"", email:"" });

  const load = async () => { setLoading(true); try { setItems(await apiClient("/api/admin/administrators")); } catch(e:any) { setError(e.message); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const action = async (id:number, path:string, options:RequestInit={method:"POST"}) => { setBusy(id); setError(""); try { await apiClient(`/api/admin/administrators/${id}/${path}`, options); await load(); } catch(e:any) { setError(e.message); } finally { setBusy(null); } };
  const invite = async () => { setBusy("invite"); setError(""); try { await apiClient("/api/admin/administrators/invite", {method:"POST", body:JSON.stringify(form)}); setOpen(false); setForm({firstName:"",lastName:"",email:""}); await load(); } catch(e:any) { setError(e.message); } finally { setBusy(null); } };

  return <AdminPage>
    <AdminPageHeader title="Administrators" description="Manage who can access bookings, services, and availability." actions={<AdminButton variant="primary" onClick={()=>setOpen(true)}><Plus size={16}/> Add administrator</AdminButton>} />
    {error && <AdminAlert tone="error" className="mb-4">{error}</AdminAlert>}
    <AdminCard>
      {loading ? <div role="status" className="space-y-3 p-5"><span className="sr-only">Loading administrators</span>{[1,2,3].map(item=><div key={item} className="h-16 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-700" />)}</div> : items.length === 0 ? <AdminEmptyState title="No administrators yet" description="Invite an administrator to share access to the salon dashboard." action={<AdminButton variant="primary" onClick={()=>setOpen(true)}>Add administrator</AdminButton>} /> : items.map(item=><div key={item.id} className="grid min-h-20 gap-3 border-b border-neutral-100 p-4 last:border-0 sm:grid-cols-[1fr_auto_auto] sm:items-center dark:border-neutral-700">
        <div className="min-w-0"><p className="font-medium">{item.firstName} {item.lastName}</p><p className="truncate text-sm text-neutral-500">{item.email}</p><p className="mt-1 text-xs text-neutral-400">{item.lastLogin ? `Last sign-in ${new Date(item.lastLogin).toLocaleString()}` : "Has not signed in yet"}</p></div>
        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${item.status==="ACTIVE"?"bg-emerald-50 text-emerald-700":item.status==="PENDING"?"bg-amber-50 text-amber-700":"bg-neutral-100 text-neutral-600"}`}>{item.status==="PENDING"?"Invitation pending":item.status.charAt(0)+item.status.slice(1).toLowerCase()}</span>
        <div className="flex flex-wrap justify-end gap-2">{item.status==="PENDING"?<AdminButton disabled={busy===item.id} onClick={()=>action(item.id,"resend-invitation")}>Resend</AdminButton>:<AdminButton disabled={busy===item.id} onClick={()=>action(item.id,"send-password-reset")}>Reset password</AdminButton>}<AdminButton variant={item.status==="DISABLED"?"secondary":"danger"} disabled={busy===item.id} onClick={()=>action(item.id,"status",{method:"PATCH",body:JSON.stringify({status:item.status==="DISABLED"?"ACTIVE":"DISABLED"})})}>{item.status==="DISABLED"?"Reactivate":"Disable"}</AdminButton></div>
      </div>)}
    </AdminCard>
    {open && <div className={adminUi.modalOverlay}><form onSubmit={e=>{e.preventDefault();void invite();}} className={`${adminUi.modal} max-w-md p-5 sm:p-6`}><h2 className="text-xl font-semibold">Add administrator</h2><p className="mt-1 text-sm text-neutral-500">They’ll receive a secure link to create their password.</p><div className="mt-5 grid gap-4"><label className={adminUi.label}>First name<input required value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} className={`${adminUi.input} mt-1 font-normal`}/></label><label className={adminUi.label}>Last name<input required value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} className={`${adminUi.input} mt-1 font-normal`}/></label><label className={adminUi.label}>Email address<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className={`${adminUi.input} mt-1 font-normal`}/></label></div><div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-3"><AdminButton type="button" onClick={()=>setOpen(false)}>Cancel</AdminButton><AdminButton variant="primary" disabled={busy==="invite"}>{busy==="invite"?"Sending…":"Send invitation"}</AdminButton></div></form></div>}
  </AdminPage>;
}
