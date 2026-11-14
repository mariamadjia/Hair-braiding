"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Check,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config/api";
import { getAuthToken } from "@/lib/utils/auth";
import { Button } from "@/components/ui/button";

type Chat = {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  message: string;
  imageUrl?: string;
  createdAt: string;
  read: boolean;
};
type Application = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  yearsOfExperience: string;
  specialties: string;
  availability: string;
  portfolio?: string;
  status: string;
  read: boolean;
  adminNotes?: string;
  createdAt: string;
  photos: string[];
};
type Item = {
  key: string;
  kind: "CHAT" | "APPLICATION";
  id: number;
  name: string;
  email: string;
  phone: string;
  preview: string;
  createdAt: string;
  read: boolean;
  chat?: Chat;
  application?: Application;
};

const date = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(`${value.replace(/Z$/, "")}Z`));

export default function AdminInbox({ onUnreadCountChange }: { onUnreadCountChange?: (count: number) => void }) {
  const [tab, setTab] = useState<"ALL" | "CHAT" | "APPLICATION">("ALL");
  const [chats, setChats] = useState<Chat[]>([]),
    [applications, setApplications] = useState<Application[]>([]);
  const [selected, setSelected] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const headers = () => {
    const token = getAuthToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [chatResponse, applicationResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/chat/messages`, {
          headers: headers(),
          cache: "no-store",
        }),
        fetch(`${API_BASE_URL}/api/admin/braider-applications`, {
          headers: headers(),
          cache: "no-store",
        }),
      ]);
      if (!chatResponse.ok || !applicationResponse.ok)
        throw new Error("Inbox could not be loaded.");
      setChats(await chatResponse.json());
      setApplications(await applicationResponse.json());
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Inbox could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    onUnreadCountChange?.(
      chats.filter((chat) => !chat.read).length +
        applications.filter((application) => !application.read).length,
    );
  }, [applications, chats, onUnreadCountChange]);
  const items = useMemo<Item[]>(
    () =>
      [
        ...chats.map((chat) => ({
          key: `CHAT-${chat.id}`,
          kind: "CHAT" as const,
          id: chat.id,
          name: chat.customerName,
          email: chat.customerEmail,
          phone: chat.customerPhone,
          preview: chat.message,
          createdAt: chat.createdAt,
          read: chat.read,
          chat,
        })),
        ...applications.map((application) => ({
          key: `APPLICATION-${application.id}`,
          kind: "APPLICATION" as const,
          id: application.id,
          name: `${application.firstName} ${application.lastName}`,
          email: application.email,
          phone: application.phone,
          preview: `${application.yearsOfExperience} experience · ${application.specialties}`,
          createdAt: application.createdAt,
          read: application.read,
          application,
        })),
      ]
        .filter((item) => tab === "ALL" || item.kind === tab)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [chats, applications, tab],
  );
  const current =
    items.find((item) => item.key === selected) ?? items[0] ?? null;
  const patchApplication = async (
    id: number,
    body: Record<string, unknown>,
  ) => {
    setSaving(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/braider-applications/${id}`,
        { method: "PATCH", headers: headers(), body: JSON.stringify(body) },
      );
      if (!response.ok) throw new Error("Application could not be updated.");
      const updated = await response.json();
      setApplications((values) =>
        values.map((value) => (value.id === id ? updated : value)),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Application could not be updated.",
      );
    } finally {
      setSaving(false);
    }
  };
  const open = async (item: Item) => {
    setSelected(item.key);
    if (item.read) return;
    if (item.kind === "CHAT") {
      await fetch(`${API_BASE_URL}/api/chat/messages/${item.id}/read`, {
        method: "PUT",
        headers: headers(),
      });
      setChats((values) =>
        values.map((value) =>
          value.id === item.id ? { ...value, read: true } : value,
        ),
      );
    } else await patchApplication(item.id, { read: true });
  };
  if (loading)
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-serif text-3xl">Inbox</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Website messages and braider applications in one place.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      <div className="mb-4 flex gap-5 border-b">
        {(["ALL", "CHAT", "APPLICATION"] as const).map((value) => (
          <button
            key={value}
            onClick={() => {
              setTab(value);
              setSelected(null);
            }}
            className={`border-b-2 px-1 pb-3 text-sm font-semibold ${tab === value ? "border-[#8B4D30] text-[#7A4028]" : "border-transparent text-neutral-500"}`}
          >
            {value === "ALL"
              ? "All"
              : value === "CHAT"
                ? "Website messages"
                : "Braider applications"}
          </button>
        ))}
      </div>
      <div className="grid min-h-[620px] overflow-hidden rounded-2xl border bg-white lg:grid-cols-[350px_minmax(0,1fr)]">
        <aside className="max-h-[720px] overflow-y-auto border-b bg-neutral-50 p-2 lg:border-b-0 lg:border-r">
          {items.length === 0 ? (
            <p className="p-8 text-center text-sm text-neutral-500">
              No messages yet.
            </p>
          ) : (
            items.map((item) => (
              <button
                key={item.key}
                onClick={() => void open(item)}
                className={`mb-1 w-full rounded-xl p-4 text-left ${current?.key === item.key ? "bg-[#2C1810] text-white" : "hover:bg-white"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {item.kind === "CHAT" ? (
                      <MessageCircle className="h-4 w-4" />
                    ) : (
                      <BriefcaseBusiness className="h-4 w-4" />
                    )}
                    {item.name}
                  </span>
                  {!item.read && (
                    <span className="h-2.5 w-2.5 rounded-full bg-[#d7784b]" />
                  )}
                </div>
                <p
                  className={`mt-2 line-clamp-2 text-xs ${current?.key === item.key ? "text-neutral-300" : "text-neutral-500"}`}
                >
                  {item.preview}
                </p>
                <p
                  className={`mt-2 text-[11px] ${current?.key === item.key ? "text-neutral-400" : "text-neutral-400"}`}
                >
                  {date(item.createdAt)}
                </p>
              </button>
            ))
          )}
        </aside>
        <section className="min-w-0 overflow-y-auto p-5 sm:p-7">
          {current ? (
            <>
              <div className="border-b pb-5">
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9A5A3A]">
                  {current.kind === "CHAT"
                    ? "Website message"
                    : "Braider application"}
                </p>
                <h3 className="mt-1 font-serif text-3xl">{current.name}</h3>
                <p className="mt-2 text-sm text-neutral-500">
                  Received {date(current.createdAt)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={`tel:${current.phone}`}
                    className="inline-flex h-10 items-center rounded-lg border px-3 text-sm font-medium"
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Call
                  </a>
                  <a
                    href={`sms:${current.phone}`}
                    className="inline-flex h-10 items-center rounded-lg border px-3 text-sm font-medium"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Text
                  </a>
                  <a
                    href={`mailto:${current.email}`}
                    className="inline-flex h-10 items-center rounded-lg border px-3 text-sm font-medium"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </a>
                </div>
                <div className="mt-3 text-sm">
                  <p>{current.email}</p>
                  <p>{current.phone}</p>
                </div>
              </div>
              {current.chat && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold">Message</h4>
                  <p className="mt-3 whitespace-pre-wrap rounded-xl bg-neutral-50 p-5 leading-7">
                    {current.chat.message}
                  </p>
                  {current.chat.imageUrl && (
                    <img
                      src={`${API_BASE_URL}${current.chat.imageUrl}`}
                      alt="Customer upload"
                      className="mt-5 max-h-[520px] rounded-xl border object-contain"
                    />
                  )}
                </div>
              )}
              {current.application && (
                <ApplicationView
                  application={current.application}
                  saving={saving}
                  onPatch={(body) => void patchApplication(current.id, body)}
                />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">
              Select a message.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ApplicationView({
  application,
  saving,
  onPatch,
}: {
  application: Application;
  saving: boolean;
  onPatch: (body: Record<string, unknown>) => void;
}) {
  const [notes, setNotes] = useState(application.adminNotes ?? "");
  useEffect(
    () => setNotes(application.adminNotes ?? ""),
    [application.id, application.adminNotes],
  );
  return (
    <div className="mt-6 space-y-6">
      <dl className="grid gap-4 rounded-xl bg-neutral-50 p-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-neutral-500">Experience</dt>
          <dd className="font-medium">{application.yearsOfExperience}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Availability</dt>
          <dd className="font-medium">{application.availability}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-neutral-500">Specialties</dt>
          <dd className="font-medium">{application.specialties}</dd>
        </div>
        {application.portfolio && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-neutral-500">Portfolio</dt>
            <dd>
              <a
                className="underline"
                href={application.portfolio}
                target="_blank"
              >
                {application.portfolio}
              </a>
            </dd>
          </div>
        )}
      </dl>
      <label className="block">
        <span className="text-sm font-semibold">Application status</span>
        <select
          value={application.status}
          onChange={(event) => onPatch({ status: event.target.value })}
          className="mt-2 h-11 w-full max-w-xs rounded-lg border px-3"
        >
          <option value="NEW">New</option>
          <option value="REVIEWING">Reviewing</option>
          <option value="CONTACTED">Contacted</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="DECLINED">Declined</option>
        </select>
      </label>
      {application.photos.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold">Work photos</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {application.photos.map((src, index) => (
              <img
                key={index}
                src={src}
                alt={`Portfolio ${index + 1}`}
                className="h-64 w-full rounded-xl border object-cover"
              />
            ))}
          </div>
        </div>
      )}
      <label className="block">
        <span className="text-sm font-semibold">Private notes</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={5}
          className="mt-2 w-full rounded-xl border p-4"
        />
        <Button
          className="mt-2"
          disabled={saving}
          onClick={() => onPatch({ adminNotes: notes })}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Save notes
        </Button>
      </label>
    </div>
  );
}
