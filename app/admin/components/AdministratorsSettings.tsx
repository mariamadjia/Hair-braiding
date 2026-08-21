"use client";

import { useEffect, useState } from "react";
import { Mail, MoreVertical, Plus, RefreshCcw, ShieldCheck, UserX } from "lucide-react";
import { apiClient } from "@/lib/api/client";

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

  return <div className="mx-auto w-full max-w-6xl p-5 sm:p-8">
    <div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-2xl font-semibold">Administrators</h2><p className="mt-1 text-sm text-neutral-500">Manage who can access bookings, services, and availability.</p></div><button onClick={()=>setOpen(true)} className="flex h-11 items-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white"><Plus size={17}/> Add administrator</button></div>
    {error && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {loading ? <div className="p-8 text-sm text-neutral-500">Loading administrators…</div> : items.map(item=><div key={item.id} className="grid gap-3 border-b border-neutral-100 p-4 last:border-0 sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <div className="min-w-0"><p className="font-medium">{item.firstName} {item.lastName}</p><p className="truncate text-sm text-neutral-500">{item.email}</p><p className="mt-1 text-xs text-neutral-400">{item.lastLogin ? `Last sign-in ${new Date(item.lastLogin).toLocaleString()}` : "Has not signed in yet"}</p></div>
        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${item.status==="ACTIVE"?"bg-emerald-50 text-emerald-700":item.status==="PENDING"?"bg-amber-50 text-amber-700":"bg-neutral-100 text-neutral-600"}`}>{item.status==="PENDING"?"Invitation pending":item.status.charAt(0)+item.status.slice(1).toLowerCase()}</span>
        <div className="flex flex-wrap justify-end gap-2">{item.status==="PENDING"?<button disabled={busy===item.id} onClick={()=>action(item.id,"resend-invitation")} className="h-9 rounded-md border px-3 text-sm">Resend</button>:<button disabled={busy===item.id} onClick={()=>action(item.id,"send-password-reset")} className="h-9 rounded-md border px-3 text-sm">Reset password</button>}<button disabled={busy===item.id} onClick={()=>action(item.id,"status",{method:"PATCH",body:JSON.stringify({status:item.status==="DISABLED"?"ACTIVE":"DISABLED"})})} className="h-9 rounded-md border px-3 text-sm">{item.status==="DISABLED"?"Reactivate":"Disable"}</button></div>
      </div>)}
    </div>
    {open && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4"><form onSubmit={e=>{e.preventDefault();void invite();}} className="max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-xl sm:p-6"><h3 className="text-xl font-semibold">Add administrator</h3><p className="mt-1 text-sm text-neutral-500">They’ll receive a secure link to create their password.</p><div className="mt-5 grid gap-4"><label className="text-sm font-medium">First name<input required value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} className="mt-1 h-11 w-full rounded-md border px-3 font-normal"/></label><label className="text-sm font-medium">Last name<input required value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} className="mt-1 h-11 w-full rounded-md border px-3 font-normal"/></label><label className="text-sm font-medium">Email address<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="mt-1 h-11 w-full rounded-md border px-3 font-normal"/></label></div><div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-3"><button type="button" onClick={()=>setOpen(false)} className="h-11 rounded-md border px-4">Cancel</button><button disabled={busy==="invite"} className="h-11 rounded-md bg-neutral-950 px-5 text-white">{busy==="invite"?"Sending…":"Send invitation"}</button></div></form></div>}
  </div>;
}
