"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, BriefcaseBusiness, Check, ChevronDown, ChevronRight, ChevronUp, Clock3, CreditCard, DollarSign, Download, History, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import type { BookingCategory, BookingItem, CategoriesData } from "@/lib/booking-types";

type Tab = "overview" | "matrix" | "deposits" | "history";
type Row = {
  category: BookingCategory;
  subcategory: NonNullable<BookingCategory["subcategories"]>[number];
  groupKey: string;
  item: BookingItem;
};
type Change = { id: number; createdAt: string; serviceName: string; action: string; summary: string; changedBy?: string; beforeValue?: string; afterValue?: string };

const PRICE_MATRIX_LENGTH_ORDER = ["shoulder", "arm pit", "bra strap", "mid back", "waist", "hip", "tailbone", "classic", "mid thigh"];
const MAX_PRICE = 10_000;

const normalizeLengthName = (name: string) => name
  .trim()
  .toLowerCase()
  .replace(/[-_]+/g, " ")
  .replace(/\barmpit\b/g, "arm pit")
  .replace(/\bmid thight\b/g, "mid thigh")
  .replace(/\s+/g, " ");

const comparePriceMatrixLengths = (left: string, right: string) => {
  const leftIndex = PRICE_MATRIX_LENGTH_ORDER.indexOf(normalizeLengthName(left));
  const rightIndex = PRICE_MATRIX_LENGTH_ORDER.indexOf(normalizeLengthName(right));
  if (leftIndex !== -1 && rightIndex !== -1) return leftIndex - rightIndex;
  if (leftIndex !== -1) return -1;
  if (rightIndex !== -1) return 1;
  return 0;
};

const comparePriceMatrixSizes = (left: Row, right: Row) => {
  const order = (left.item.displayOrder ?? Number.MAX_SAFE_INTEGER)
    - (right.item.displayOrder ?? Number.MAX_SAFE_INTEGER);
  return order || left.item.name.localeCompare(right.item.name);
};

const money = (value?: string) => {
  const amount = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) ? `$${amount.toFixed(0)}` : "—";
};

const parsePrice = (value?: string) => {
  const normalized = String(value ?? "").trim().replaceAll("$", "").replaceAll(",", "");
  return /^-?\d+(?:\.\d{0,2})?$/.test(normalized) ? Number(normalized) : Number.NaN;
};
const hasValidPrice = (value?: string) => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return false;
  const amount = parsePrice(value);
  return Number.isFinite(amount) && amount > 0 && amount <= MAX_PRICE;
};
const hasValidAdjustment = (value?: string) => {
  const trimmed = String(value ?? "").trim();
  const amount = parsePrice(value);
  return trimmed !== "" && Number.isFinite(amount) && amount >= 0 && amount <= MAX_PRICE;
};

type PricingIssue = { category: BookingCategory; subcategory: NonNullable<BookingCategory["subcategories"]>[number]; item: BookingItem; option?: string };

export function PricingManagement({ token }: { token: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<CategoriesData | null>(null);
  const [drafts, setDrafts] = useState<Record<number, BookingItem>>({});
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [history, setHistory] = useState<Change[]>([]);
  const [defaultDepositCents, setDefaultDepositCents] = useState(5000);
  const [defaultDepositInput, setDefaultDepositInput] = useState("50.00");
  const [depositSettingsVersion, setDepositSettingsVersion] = useState(0);
  const [depositOverrides, setDepositOverrides] = useState<Record<number, number | null>>({});
  const [depositOverrideInputs, setDepositOverrideInputs] = useState<Record<number, string>>({});
  const initialDeposits = useRef<{ defaultDepositCents: number; overrides: Record<number, number | null> }>({ defaultDepositCents: 5000, overrides: {} });
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkMode, setBulkMode] = useState<"fixed" | "percent">("fixed");
  const [showBulk, setShowBulk] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [collapsedSubcategories, setCollapsedSubcategories] = useState<Set<string>>(new Set());
  const [depositQuery, setDepositQuery] = useState("");
  const [depositCategory, setDepositCategory] = useState("all");
  const [addLengthTarget, setAddLengthTarget] = useState<{ groupKey: string; subcategoryName: string } | null>(null);
  const [newLengthName, setNewLengthName] = useState("");
  const [newLengthPrices, setNewLengthPrices] = useState<Record<number, string>>({});
  const [newLengthKnotlessPrices, setNewLengthKnotlessPrices] = useState<Record<number, string>>({});
  const [showPricingIssues, setShowPricingIssues] = useState(false);
  const [collapsedIssueGroups, setCollapsedIssueGroups] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true); setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [catalogResponse, depositResponse, historyResponse] = await Promise.all([
        fetch("/api/admin/categories", { headers, cache: "no-store" }),
        fetch("/api/admin/pricing/deposits", { headers, cache: "no-store" }),
        fetch("/api/admin/pricing/history", { headers, cache: "no-store" }),
      ]);
      const payload = await catalogResponse.json().catch(() => ({}));
      if (!catalogResponse.ok) throw new Error(payload.error || "Unable to load pricing.");
      const depositPayload = await depositResponse.json().catch(() => ({}));
      if (!depositResponse.ok) throw new Error(depositPayload.error || "Unable to load deposit settings.");
      const historyPayload = await historyResponse.json().catch(() => ({}));
      if (!historyResponse.ok) throw new Error(historyPayload.error || "Unable to load pricing history.");
      setData(payload);
      setDefaultDepositCents(depositPayload.defaultDepositCents);
      setDefaultDepositInput((depositPayload.defaultDepositCents / 100).toFixed(2));
      setDepositSettingsVersion(depositPayload.version ?? 0);
      const nextOverrides = Object.fromEntries((depositPayload.overrides ?? []).map((entry: { serviceId: number; depositCents: number }) => [entry.serviceId, entry.depositCents]));
      setDepositOverrides(nextOverrides);
      setDepositOverrideInputs(Object.fromEntries(Object.entries(nextOverrides).map(([id, cents]) => [id, (Number(cents) / 100).toFixed(2)])));
      initialDeposits.current = { defaultDepositCents: depositPayload.defaultDepositCents, overrides: nextOverrides };
      setHistory(Array.isArray(historyPayload) ? historyPayload : []);
      setDrafts({});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load pricing.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [token]);

  const rows = useMemo<Row[]>(() => (data?.categories ?? []).flatMap(category => {
    // Older backend payloads included subcategory services again in category.items.
    // Exclude those duplicates so Pricing mirrors the Services hierarchy exactly.
    const nestedItemIds = new Set(
      (category.subcategories ?? []).flatMap(subcategory =>
        (subcategory.items ?? []).map(item => item.id).filter((id): id is number => id != null)
      )
    );
    const directItems = (category.items ?? []).filter(item => item.id == null || !nestedItemIds.has(item.id));
    const direct = directItems.length
      ? [{ id: category.id, name: category.name, slug: `${category.slug}-services`, items: directItems }]
      : [];
    return [...direct, ...(category.subcategories ?? [])].flatMap(subcategory =>
      (subcategory.items ?? []).map(item => ({
        category,
        subcategory,
        groupKey: `${category.slug}:${subcategory.slug}`,
        item: drafts[item.id ?? -1] ?? item,
      }))
    );
  }), [data, drafts]);

  const visibleRows = rows.filter(({ category, subcategory, item }) => {
    const haystack = `${category.name} ${subcategory.name} ${item.name} ${(item.lengthOptions ?? []).map(option => option.name).join(" ")}`.toLowerCase();
    return (categoryFilter === "all" || category.slug === categoryFilter) && haystack.includes(query.toLowerCase());
  });
  const dirtyIds = Object.keys(drafts).map(Number);
  const dirtyPriceCount = useMemo(() => Object.entries(drafts).reduce((total, [id, draft]) => {
    const original = (data?.categories ?? [])
      .flatMap(category => [
        ...(category.items?.length ? [{ items: category.items }] : []),
        ...(category.subcategories ?? []),
      ])
      .flatMap(subcategory => subcategory.items ?? [])
      .find(item => item.id === Number(id));

    if (!original) return total + 1;

    let changed = String(original.price ?? "") !== String(draft.price ?? "") ? 1 : 0;
    const originalOptions = new Map((original.lengthOptions ?? []).map(option => [option.name, String(option.price ?? "")]));
    const draftOptions = new Map((draft.lengthOptions ?? []).map(option => [option.name, String(option.price ?? "")]));
    const optionNames = new Set([...originalOptions.keys(), ...draftOptions.keys()]);
    optionNames.forEach(name => {
      if (originalOptions.get(name) !== draftOptions.get(name)) changed += 1;
    });

    const originalKnotless = new Map((original.lengthOptions ?? []).map(option => [option.name, String(option.knotlessPrice ?? "")]));
    const draftKnotless = new Map((draft.lengthOptions ?? []).map(option => [option.name, String(option.knotlessPrice ?? "")]));
    optionNames.forEach(name => {
      if (originalKnotless.get(name) !== draftKnotless.get(name)) changed += 1;
    });

    if (String(original.knotlessPriceAdjustment ?? "") !== String(draft.knotlessPriceAdjustment ?? "")) changed += 1;
    return total + changed;
  }, 0), [data, drafts]);
  const allPrices = rows.flatMap(({ item }) => item.lengthOptions?.length
    ? item.lengthOptions.map(option => parsePrice(option.price))
    : [parsePrice(item.price)]).filter(value => Number.isFinite(value) && value > 0);
  const depositInputsDirty = defaultDepositInput !== (initialDeposits.current.defaultDepositCents / 100).toFixed(2)
    || rows.some(({ item }) => {
      if (!item.id || !(item.id in depositOverrideInputs)) return false;
      const initial = initialDeposits.current.overrides[item.id];
      return depositOverrideInputs[item.id] !== (initial == null ? "" : (initial / 100).toFixed(2));
    });
  const depositsDirty = defaultDepositCents !== initialDeposits.current.defaultDepositCents
    || rows.some(({ item }) => (depositOverrides[item.id!] ?? null) !== (initialDeposits.current.overrides[item.id!] ?? null));
  const hasUnsavedChanges = dirtyIds.length > 0 || depositsDirty || depositInputsDirty;

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    document.documentElement.dataset.pricingDirty = hasUnsavedChanges ? "true" : "false";
    return () => { delete document.documentElement.dataset.pricingDirty; };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get("pricingTab") as Tab | null;
    if (selected && ["overview", "matrix", "deposits", "history"].includes(selected)) setTab(selected);
  }, []);

  useEffect(() => {
    const closeDialog = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setAddLengthTarget(null);
    };
    window.addEventListener("keydown", closeDialog);
    return () => window.removeEventListener("keydown", closeDialog);
  }, []);

  const selectTab = (next: Tab) => {
    if (next === tab) return;
    if (hasUnsavedChanges && !window.confirm("Discard your unsaved pricing changes and switch tabs?")) return;
    if (hasUnsavedChanges) {
      setDrafts({});
      setDefaultDepositCents(initialDeposits.current.defaultDepositCents);
      setDefaultDepositInput((initialDeposits.current.defaultDepositCents / 100).toFixed(2));
      setDepositOverrides(initialDeposits.current.overrides);
      setDepositOverrideInputs(Object.fromEntries(Object.entries(initialDeposits.current.overrides).map(([id, cents]) => [id, cents == null ? "" : (cents / 100).toFixed(2)])));
    }
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("pricingTab", next);
    window.history.replaceState({}, "", url);
  };
  const depositRows = rows.filter(({ category, subcategory, item }) => {
    const matchesCategory = depositCategory === "all" || category.slug === depositCategory;
    const matchesSearch = `${item.name} ${subcategory.name}`.toLowerCase().includes(depositQuery.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });
  const pricingIssues = rows.flatMap<PricingIssue>(({ category, subcategory, item }) => {
    const issues: PricingIssue[] = [];
    if (item.lengthOptions?.length) {
      item.lengthOptions.forEach(option => {
        if (!hasValidPrice(option.price)) issues.push({ category, subcategory, item, option: option.name || "Unnamed length" });
      });
    } else if (!hasValidPrice(item.price)) {
      issues.push({ category, subcategory, item });
    }
    if (item.foundationChoicesEnabled && item.knotlessPricingMode === "SEPARATE") {
      (item.lengthOptions ?? []).forEach(option => {
        if (!hasValidPrice(option.knotlessPrice)) {
          issues.push({ category, subcategory, item, option: `Knotless ${option.name || "Unnamed length"}` });
        }
      });
    } else if (item.foundationChoicesEnabled && !hasValidAdjustment(item.knotlessPriceAdjustment)) {
      issues.push({ category, subcategory, item, option: "Knotless adjustment" });
    }
    return issues;
  });

  const pricingIssueGroups = useMemo(() => {
    const groups = new Map<string, { category: BookingCategory; issues: PricingIssue[] }>();
    pricingIssues.forEach(issue => {
      const key = issue.category.slug || String(issue.category.id);
      const current = groups.get(key);
      if (current) current.issues.push(issue);
      else groups.set(key, { category: issue.category, issues: [issue] });
    });
    return Array.from(groups.values());
  }, [pricingIssues]);

  const jumpToPricingIssue = (issue: PricingIssue) => {
    setTab("matrix");
    setQuery(issue.item.name);
    setCategoryFilter("all");
    setShowPricingIssues(false);

    setCollapsedCategories(previous => {
      const next = new Set(previous);
      next.delete(issue.category.slug);
      return next;
    });

    const subKey = `${issue.category.slug}:${issue.subcategory.slug}`;
    setCollapsedSubcategories(previous => {
      const next = new Set(previous);
      next.delete(subKey);
      return next;
    });

    window.setTimeout(() => {
      const serviceId = String(issue.item.id ?? "");
      const priceKey = issue.option ?? "Base price";
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("[data-pricing-service-id]"));
      const exactInput = inputs.find(input => input.dataset.pricingServiceId === serviceId && input.dataset.pricingPriceKey === priceKey);
      const row = document.querySelector<HTMLElement>(`[data-pricing-row-id="${serviceId}"]`);
      const target = exactInput ?? row;
      target?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      if (exactInput) {
        window.setTimeout(() => {
          exactInput.focus();
          exactInput.select();
        }, 250);
      }
    }, 100);
  };

  const updateItem = (id: number, recipe: (item: BookingItem) => BookingItem) => {
    const source = rows.find(row => row.item.id === id)?.item;
    if (source) setDrafts(previous => ({ ...previous, [id]: recipe(structuredClone(source)) }));
  };

  const save = async () => {
    if (!dirtyIds.length) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const changes = dirtyIds.map(id => {
        const item = drafts[id];
        return {
          serviceId: id,
          version: item.version ?? 0,
          basePriceCents: item.lengthOptions?.length ? undefined : Math.round(parsePrice(item.price) * 100),
          knotlessAdjustmentCents: item.foundationChoicesEnabled && item.knotlessPricingMode !== "SEPARATE"
            ? Math.round(parsePrice(item.knotlessPriceAdjustment) * 100) : undefined,
          lengths: (item.lengthOptions ?? []).map((option, displayOrder) => ({
            lengthOptionId: option.id,
            priceCents: Math.round(parsePrice(option.price) * 100),
            knotlessPriceCents: item.foundationChoicesEnabled && item.knotlessPricingMode === "SEPARATE"
              ? Math.round(parsePrice(option.knotlessPrice) * 100) : undefined,
            displayOrder,
          })),
        };
      });
      if (changes.some(change => ((!change.basePriceCents || change.basePriceCents > MAX_PRICE * 100) && !change.lengths.length)
        || change.lengths.some(length => !length.lengthOptionId || length.priceCents < 1
          || length.priceCents > MAX_PRICE * 100
          || (length.knotlessPriceCents != null && (length.knotlessPriceCents < 1 || length.knotlessPriceCents > MAX_PRICE * 100))))) {
        throw new Error(`Every published price must be between $0.01 and $${MAX_PRICE.toLocaleString()}.`);
      }
      const response = await fetch("/api/admin/pricing/prices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ changes }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to save pricing changes.");
      setSuccess(`${dirtyIds.length} service price${dirtyIds.length === 1 ? "" : "s"} saved.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save pricing.");
    } finally { setSaving(false); }
  };

  const applyBulkAdjustment = () => {
    const adjustment = Number(bulkAmount);
    if (!Number.isFinite(adjustment) || adjustment === 0) return setError("Enter a valid non-zero adjustment.");
    const targetRows = visibleRows;
    if (!targetRows.length) return setError("No services match the current filters.");
    const currentPrices = targetRows.flatMap(({ item }) => item.lengthOptions?.length
      ? item.lengthOptions.flatMap(option => [
          { service: item.name, option: option.name, value: parsePrice(option.price) },
          ...(item.foundationChoicesEnabled && item.knotlessPricingMode === "SEPARATE"
            ? [{ service: item.name, option: `Knotless ${option.name}`, value: parsePrice(option.knotlessPrice) }] : []),
        ])
      : [{ service: item.name, option: "Base price", value: parsePrice(item.price) }]);
    const invalidCurrent = currentPrices.find(price => !Number.isFinite(price.value) || price.value <= 0);
    if (invalidCurrent) {
      return setError(`${invalidCurrent.service} ${invalidCurrent.option} needs a valid price before using Bulk Edit.`);
    }
    const invalidResult = currentPrices.find(price => {
      const next = bulkMode === "percent" ? price.value * (1 + adjustment / 100) : price.value + adjustment;
      return !Number.isFinite(next) || next <= 0 || next > MAX_PRICE;
    });
    if (invalidResult) {
      return setError(`This adjustment would make ${invalidResult.service} ${invalidResult.option} zero or negative.`);
    }
    targetRows.forEach(({ item }) => updateItem(item.id!, draft => {
      const adjust = (value?: string) => {
        const current = parsePrice(value);
        const next = bulkMode === "percent" ? current * (1 + adjustment / 100) : current + adjustment;
        return (Math.round(next * 100) / 100).toFixed(2);
      };
      return draft.lengthOptions?.length
        ? { ...draft, lengthOptions: draft.lengthOptions.map(option => ({
            ...option,
            price: adjust(option.price),
            ...(draft.foundationChoicesEnabled && draft.knotlessPricingMode === "SEPARATE"
              ? { knotlessPrice: adjust(option.knotlessPrice) } : {}),
          })) }
        : { ...draft, price: adjust(draft.price) };
    }));
    setError("");
    setSuccess(`Applied ${bulkMode === "percent" ? `${adjustment}%` : money(String(adjustment))} to ${targetRows.length} filtered services. Review the highlighted cells, then save.`);
  };

  const addLengthColumn = (groupKey: string, subcategoryName = "this style") => {
    if (dirtyIds.length) {
      setError("Save or discard your current price changes before adding a length.");
      return;
    }
    const targets = rows.filter(row => row.groupKey === groupKey && row.item.id);
    setNewLengthName("");
    setNewLengthPrices(Object.fromEntries(targets.map(row => [row.item.id!, ""])));
    setNewLengthKnotlessPrices(Object.fromEntries(targets
      .filter(row => row.item.foundationChoicesEnabled && row.item.knotlessPricingMode === "SEPARATE")
      .map(row => [row.item.id!, ""])));
    setAddLengthTarget({ groupKey, subcategoryName });
  };

  const submitAddLength = async () => {
    if (!addLengthTarget) return;
    const name = newLengthName.trim();
    if (!name) {
      setError("Enter a length name.");
      return;
    }
    const targetRows = rows.filter(row => row.groupKey === addLengthTarget.groupKey && row.item.id);
    if (!targetRows.length) {
      setError("This style has no sizes to update.");
      return;
    }
    const missingPrice = targetRows.find(row => !hasValidPrice(newLengthPrices[row.item.id!]));
    if (missingPrice) return setError(`Enter a valid ${missingPrice.item.name} price greater than zero.`);
    const missingKnotlessPrice = targetRows.find(row => row.item.foundationChoicesEnabled
      && row.item.knotlessPricingMode === "SEPARATE"
      && !hasValidPrice(newLengthKnotlessPrices[row.item.id!]));
    if (missingKnotlessPrice) return setError(`Enter a valid Knotless ${missingKnotlessPrice.item.name} price.`);
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/admin/pricing/lengths", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name,
          servicePrices: targetRows.map(row => ({
            serviceId: row.item.id,
            version: row.item.version ?? 0,
            priceCents: Math.round(parsePrice(newLengthPrices[row.item.id!]) * 100),
            knotlessPriceCents: row.item.foundationChoicesEnabled && row.item.knotlessPricingMode === "SEPARATE"
              ? Math.round(parsePrice(newLengthKnotlessPrices[row.item.id!]) * 100) : undefined,
          })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to add length.");
      setSuccess(`${name} added to ${targetRows.length} size${targetRows.length === 1 ? "" : "s"} with customer-facing prices.`);
      setAddLengthTarget(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add length.");
    } finally {
      setSaving(false);
    }
  };

  const saveDeposits = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const parsedDefault = Number(defaultDepositInput);
      if (!Number.isFinite(parsedDefault) || parsedDefault <= 0 || parsedDefault > 1000) {
        throw new Error("Default deposit must be between $0.01 and $1,000.");
      }
      const nextDefaultCents = Math.round(parsedDefault * 100);
      const nextOverrides = { ...depositOverrides };
      for (const { item } of rows) {
        if (!item.id || !(item.id in depositOverrideInputs)) continue;
        const raw = depositOverrideInputs[item.id].trim();
        if (!raw) {
          nextOverrides[item.id] = null;
          continue;
        }
        const amount = Number(raw);
        if (!Number.isFinite(amount) || amount <= 0 || amount > 1000) {
          throw new Error(`${item.name} deposit must be between $0.01 and $1,000.`);
        }
        nextOverrides[item.id] = Math.round(amount * 100);
      }
      const changedOverrides = rows.flatMap(({ item }) => {
        if (!item.id || (nextOverrides[item.id] ?? null) === (initialDeposits.current.overrides[item.id] ?? null)) return [];
        return [{
          serviceId: item.id,
          version: item.version ?? 0,
          depositCents: nextOverrides[item.id] ?? null,
        }];
      });
      const response = await fetch("/api/admin/pricing/deposits", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          version: depositSettingsVersion,
          defaultDepositCents: nextDefaultCents,
          overrides: changedOverrides,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to save deposit changes. Nothing was changed.");
      }
      setDefaultDepositCents(nextDefaultCents);
      setDepositOverrides(nextOverrides);
      setSuccess("Deposit settings saved. New booking quotes will use them.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save deposits."); }
    finally { setSaving(false); }
  };

  const exportPriceList = () => {
    const lines = [["Category", "Style", "Size / Service", "Length", "Regular price", "Knotless price", "Knotless adjustment", "Deposit override"]];
    rows.forEach(({ category, subcategory, item }) => {
      const options = item.lengthOptions?.length ? item.lengthOptions : [{ name: "Base", price: item.price }];
      options.forEach(option => lines.push([
        category.name,
        subcategory.name,
        item.name,
        option.name || "Base",
        option.price || "",
        item.foundationChoicesEnabled && item.knotlessPricingMode === "SEPARATE" ? option.knotlessPrice || "" : "",
        item.foundationChoicesEnabled && item.knotlessPricingMode !== "SEPARATE" ? item.knotlessPriceAdjustment || "0" : "",
        depositOverrides[item.id!] == null ? "" : String(depositOverrides[item.id!]! / 100),
      ]));
    });
    const safeCell = (value: string) => /^[=+\-@]/.test(value.trim()) ? `'${value}` : value;
    const csv = lines.map(line => line.map(value => `"${safeCell(String(value)).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `braiding-prices-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-8 space-y-4"><div className="h-9 w-64 animate-pulse rounded bg-neutral-200" /><div className="h-72 animate-pulse rounded-xl bg-neutral-100" /></div>;
  if (!data) return <div className="m-8 rounded-xl border border-red-200 bg-red-50 p-6"><p className="text-red-800">{error || "Pricing data could not be loaded."}</p><button onClick={load} className="mt-4 rounded bg-neutral-900 px-4 py-2 text-sm text-white">Retry</button></div>;

  return (
    <div className="min-h-full bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="admin-page pb-32 sm:pb-28">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-600">Edit only the prices customers see. Names, photos, availability, and ordering stay in Services.</p>
            <a href="/admin?section=categories" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#8d4f31] underline underline-offset-4">Manage service structure <ChevronRight className="h-3.5 w-3.5" /></a>
          </div>
          <button onClick={() => { if (!hasUnsavedChanges || window.confirm("Discard unsaved pricing changes and reload?")) void load(); }} className="flex items-center gap-2 rounded-lg border border-[#d9c8b9] bg-white px-4 py-2 text-sm"><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-3">
          {[
            { label: "Services Priced", value: rows.length, icon: BriefcaseBusiness },
            { label: "Price Range", value: allPrices.length ? `${money(String(Math.min(...allPrices)))}–${money(String(Math.max(...allPrices)))}` : "—", icon: DollarSign },
            { label: "Default Deposit", value: money(String(defaultDepositCents / 100)), icon: CreditCard },
          ].map(card => {
            const content = (
              <>
                <div className={`rounded-full border p-4 ${card.label === "Pricing Issues" && pricingIssues.length ? "border-[#efc28e] bg-[#fff7ed] text-[#b7662f]" : "border-[#d9c8b9] bg-[#f6f0e7]"}`}><card.icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-neutral-600">{card.label}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">{card.value}</p>
                  {card.label === "Pricing Issues" && pricingIssues.length > 0 && (
                    <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[#8d4f31]">
                      Needs attention <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </span>
                  )}
                </div>
              </>
            );

            if (card.label === "Pricing Issues") {
              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => setShowPricingIssues(true)}
                  className={`group flex items-center gap-5 rounded-xl border bg-white px-5 py-5 text-left shadow-[0_5px_16px_rgba(56,35,21,.04)] transition ${pricingIssues.length ? "border-[#dca46d] hover:-translate-y-0.5 hover:shadow-[0_9px_24px_rgba(56,35,21,.08)]" : "border-[#ded2c7]"}`}
                >
                  {content}
                </button>
              );
            }

            return <div key={card.label} className="flex items-center gap-5 rounded-xl border border-[#ded2c7] bg-white px-5 py-5 text-left shadow-[0_5px_16px_rgba(56,35,21,.04)]">{content}</div>;
          })}
        </div>

        {false && pricingIssues.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-[#efbd79] bg-[#fff9ef] px-5 py-4 shadow-[0_4px_14px_rgba(112,64,39,.03)]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#efc692] bg-white text-[#b86633]">
              <AlertCircle className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="font-serif text-lg text-[#47281b]">{pricingIssues.length} pricing issue{pricingIssues.length === 1 ? "" : "s"}</p>
                <span className="text-neutral-300">·</span>
                <p className="text-sm font-medium text-[#6a4a3b]">{pricingIssueGroups.length} service group{pricingIssueGroups.length === 1 ? "" : "s"} affected</p>
              </div>
              <p className="mt-0.5 text-xs text-[#8c6957]">Some active service variations are missing valid prices.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPricingIssues(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#c58b59] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#ac7447]"
            >
              Review <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mb-6 flex gap-7 overflow-x-auto border-b border-[#d8cabc]">
          {(["overview", "matrix", "deposits", "history"] as Tab[]).map(value => (
            <button key={value} onClick={() => selectTab(value)} className={`min-w-max border-b-2 px-1 py-3 text-sm capitalize ${tab === value ? "border-[#7b482d] font-semibold text-[#351a10]" : "border-transparent text-neutral-600 hover:text-[#351a10]"}`}>{value === "matrix" ? "Price Matrix" : value}</button>
          ))}
        </div>

        {error && <div role="alert" className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="h-4 w-4" />{error}</div>}
        {success && <div role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><Check className="h-4 w-4" />{success}</div>}

        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
              <section className="rounded-xl border border-[#ded2c7] bg-white p-6">
                <h3 className="text-lg font-semibold">Catalog health</h3>
                <div className="mt-7 grid grid-cols-3 divide-x divide-[#decfc1] text-center">
                  <div><p className="font-serif text-4xl">{rows.length}</p><p className="mt-1 text-sm text-neutral-600">priced services</p></div>
                  <div><p className="font-serif text-4xl">{rows.reduce((total, row) => total + (row.item.lengthOptions?.length || 1), 0)}</p><p className="mt-1 text-sm text-neutral-600">price options</p></div>
                  <div><p className="font-serif text-4xl">{data.categories.length}</p><p className="mt-1 text-sm text-neutral-600">service categories</p></div>
                </div>
                <div className="mt-8 h-3 overflow-hidden rounded-full bg-[#eee7de]"><div className="h-full rounded-full bg-[#351a10]" style={{ width: `${rows.length ? Math.round(((rows.length - new Set(pricingIssues.map(issue => issue.item.id)).size) / rows.length) * 100) : 0}%` }} /></div>
                <p className="mt-3 text-right text-xs font-medium text-neutral-500">{rows.length ? Math.round(((rows.length - new Set(pricingIssues.map(issue => issue.item.id)).size) / rows.length) * 100) : 0}% of services have complete pricing</p>
              </section>
              <section className="rounded-xl border border-[#ded2c7] bg-white p-6">
                <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Recent changes</h3><button onClick={() => setTab("history")} className="flex items-center gap-1 text-sm underline">View history <ChevronRight className="h-4 w-4" /></button></div>
                {history.length ? <div className="mt-4 divide-y divide-[#e7ddd3]">{history.slice(0, 4).map(entry => <div key={entry.id} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 py-3">
                  <div className="rounded-full bg-[#f3eadf] p-2"><Clock3 className="h-4 w-4" /></div>
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{entry.serviceName}</p><p className="truncate text-xs text-neutral-500">{entry.summary}</p></div>
                  <time className="text-xs text-neutral-500">{new Date(entry.createdAt).toLocaleDateString()}</time>
                </div>)}</div> : <div className="flex h-40 items-center justify-center text-sm text-neutral-500">No pricing changes recorded yet.</div>}
              </section>
            </div>
            <section className="rounded-xl border border-[#ded2c7] bg-white p-5">
              <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Pricing by category</h3><button onClick={() => setTab("matrix")} className="flex items-center gap-1 text-sm underline">View price matrix <ChevronRight className="h-4 w-4" /></button></div>
              <div className="mt-4 overflow-x-auto rounded-lg border border-[#e2d7cd]">
                <table className="w-full min-w-[600px] text-sm"><thead><tr className="bg-[#f6f1ea] text-left"><th className="px-4 py-3">Category</th><th className="px-4 py-3">Services</th><th className="px-4 py-3">Price Range</th><th className="px-4 py-3">Deposit</th></tr></thead><tbody>
                {data.categories.map(category => {
                  const categoryRows = rows.filter(row => row.category.slug === category.slug);
                  const prices = categoryRows.flatMap(row => row.item.lengthOptions?.map(o => Number(o.price)) ?? [Number(row.item.price)]).filter(Number.isFinite);
                  return <tr key={category.slug} className="border-t border-[#e7ddd3]"><td className="px-4 py-3 font-medium">{category.name}</td><td className="px-4 py-3">{categoryRows.length}</td><td className="px-4 py-3">{prices.length ? `${money(String(Math.min(...prices)))}–${money(String(Math.max(...prices)))}` : "—"}</td><td className="px-4 py-3">{money(String(defaultDepositCents / 100))} default</td></tr>;
                })}
                </tbody></table>
              </div>
            </section>
            <section className="flex flex-wrap items-center gap-5 rounded-xl border border-[#ded2c7] bg-white p-5">
              <div className="rounded-full bg-[#f3eadf] p-4"><ShieldCheck className="h-7 w-7" /></div>
              <div className="mr-auto"><h3 className="font-serif text-xl">Keep your pricing accurate</h3><p className="mt-1 text-sm text-neutral-600">Export a current copy of every service, length, price, and deposit override.</p></div>
              <button onClick={exportPriceList} className="flex items-center gap-2 rounded-lg border border-[#7b482d] px-5 py-3 text-sm font-medium"><Download className="h-4 w-4" /> Export price list</button>
            </section>
          </div>
        )}

        {tab === "matrix" && (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-[#e2d7cc] bg-white shadow-[0_10px_35px_rgba(55,32,18,.045)]">
              <div className="flex flex-wrap items-center gap-3 border-b border-[#eee5dc] p-4 sm:p-5">
                <label className="relative min-w-[260px] flex-1 lg:max-w-xl">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Search styles, sizes, lengths…"
                    className="w-full rounded-xl border border-[#e0d4c8] bg-[#fffdfa] py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#b7734d] focus:bg-white focus:ring-4 focus:ring-[#b7734d]/10"
                  />
                </label>

                <select
                  value={categoryFilter}
                  onChange={event => setCategoryFilter(event.target.value)}
                  className="min-w-44 rounded-xl border border-[#e0d4c8] bg-[#fffdfa] px-4 py-3 text-sm outline-none focus:border-[#b7734d]"
                >
                  <option value="all">All categories</option>
                  {data.categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}
                </select>

                <button
                  onClick={() => setShowBulk(value => !value)}
                  className="flex items-center gap-2 rounded-xl border border-[#d9cabd] bg-white px-4 py-3 text-sm font-medium text-[#4b2a1c] transition hover:bg-[#fbf7f2]"
                >
                  <Pencil className="h-4 w-4" /> Bulk Edit
                </button>

                <span className="ml-auto whitespace-nowrap text-xs text-neutral-500">
                  Showing {visibleRows.length} of {rows.length} sizes/services
                </span>
              </div>

              {showBulk && (
                <div className="flex flex-wrap items-end gap-3 border-b border-[#eee5dc] bg-[#fffaf5] p-5">
                  <div className="mr-auto">
                    <p className="text-sm font-semibold text-[#351a10]">Bulk price adjustment</p>
                    <p className="mt-1 text-xs text-neutral-500">Applies to the services currently visible below.</p>
                  </div>
                  <select value={bulkMode} onChange={event => setBulkMode(event.target.value as "fixed" | "percent")} className="rounded-xl border border-[#ded1c5] bg-white px-3 py-2.5 text-sm"><option value="fixed">Dollar amount</option><option value="percent">Percentage</option></select>
                  <div className="flex w-36 overflow-hidden rounded-xl border border-[#ded1c5] bg-white"><span className="border-r border-[#eee5dc] px-3 py-2.5 text-neutral-500">{bulkMode === "fixed" ? "$" : "%"}</span><input value={bulkAmount} inputMode="decimal" onChange={event => setBulkAmount(event.target.value)} className="min-w-0 flex-1 px-2 text-sm outline-none" /></div>
                  <button onClick={applyBulkAdjustment} className="rounded-xl border border-[#ad6b45] bg-white px-4 py-2.5 text-sm font-medium text-[#8d4f31] hover:bg-[#fff5ed]">Apply for review</button>
                </div>
              )}

              {!visibleRows.length && (
                <div className="p-12 text-center">
                  <Search className="mx-auto h-6 w-6 text-neutral-400" />
                  <p className="mt-3 text-sm font-medium">No services match your filters</p>
                  <p className="mt-1 text-sm text-neutral-500">Try a different search term or switch category to &quot;All categories&quot;.</p>
                  {(query || categoryFilter !== "all") && <button onClick={() => { setQuery(""); setCategoryFilter("all"); }} className="mt-4 text-sm font-medium text-[#8d4f31] underline underline-offset-4">Clear filters</button>}
                </div>
              )}

              <div className="divide-y divide-[#eee5dc]">
                {data.categories.filter(category => visibleRows.some(row => row.category.slug === category.slug)).map(category => {
                  const categoryClosed = collapsedCategories.has(category.slug);
                  const categoryRows = visibleRows.filter(row => row.category.slug === category.slug);
                  const categoryGroups = Array.from(
                    new Map(categoryRows.map(row => [row.groupKey, row.subcategory])).values()
                  );
                  const categoryKnotless = categoryRows.filter(row => row.item.foundationChoicesEnabled);
                  const knotlessAdjustments = Array.from(new Set(categoryKnotless.map(row => row.item.knotlessPriceAdjustment).filter(hasValidAdjustment)));

                  return (
                    <section key={category.slug}>
                      <div className="flex flex-wrap items-center gap-3 bg-[#fcfaf7] px-5 py-4 sm:px-6">
                        <button
                          onClick={() => setCollapsedCategories(previous => { const next = new Set(previous); next.has(category.slug) ? next.delete(category.slug) : next.add(category.slug); return next; })}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3e8da] text-[#7b482d]">
                            {categoryClosed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                          </span>
                          <span className="font-serif text-xl tracking-[.03em] text-[#2d180f] sm:text-2xl">{category.name.toUpperCase()}</span>
                          <span className="text-xs text-neutral-500">{categoryRows.length} service{categoryRows.length === 1 ? "" : "s"}</span>
                        </button>

                        {knotlessAdjustments.length === 1 && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f8eddf] px-3 py-1.5 text-xs font-medium text-[#704027]">
                            <Sparkles className="h-3.5 w-3.5" /> Knotless +{money(knotlessAdjustments[0])}
                          </span>
                        )}
                      </div>

                      {!categoryClosed && (
                        <div className="space-y-4 bg-white p-4 sm:p-5">
                          {categoryGroups.map(subcategory => {
                            const subKey = `${category.slug}:${subcategory.slug}`;
                            const subRows = visibleRows.filter(row => row.groupKey === subKey).sort(comparePriceMatrixSizes);
                            const subClosed = collapsedSubcategories.has(subKey);
                            const lengthNames = Array.from(new Set(subRows.flatMap(row => row.item.lengthOptions?.map(option => option.name || "") ?? [])))
                              .filter(Boolean)
                              .sort(comparePriceMatrixLengths);
                            const hasBaseOnly = subRows.some(row => !row.item.lengthOptions?.length);
                            const columns = hasBaseOnly ? ["Base price", ...lengthNames] : lengthNames;
                            const hasKnotless = subRows.some(row => row.item.foundationChoicesEnabled);
                            const usesServiceLabel = subRows.every(row => row.item.pricingMode === "FIXED" && !row.item.lengthOptions?.length);
                            const subPrices = subRows.flatMap(row => row.item.lengthOptions?.length ? row.item.lengthOptions.map(option => Number(option.price)) : [Number(row.item.price)]).filter(Number.isFinite);
                            const subPriceRange = subPrices.length ? `${money(String(Math.min(...subPrices)))}–${money(String(Math.max(...subPrices)))}` : "—";

                            return (
                              <div key={subcategory.slug} className="overflow-hidden rounded-2xl border border-[#eadfd5] bg-white">
                                <div className="flex flex-wrap items-center gap-4 border-b border-[#eee5dc] px-5 py-4">
                                  <button
                                    onClick={() => setCollapsedSubcategories(previous => { const next = new Set(previous); next.has(subKey) ? next.delete(subKey) : next.add(subKey); return next; })}
                                    className="min-w-0 flex-1 text-left"
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className="text-xl font-semibold text-[#2d180f]">{subcategory.name}</span>
                                      {subClosed ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronUp className="h-4 w-4 text-neutral-400" />}
                                    </span>
                                    <span className="mt-1 block text-xs text-neutral-500">{subRows.length} {usesServiceLabel ? `service${subRows.length === 1 ? "" : "s"}` : `size${subRows.length === 1 ? "" : "s"}`} · {columns.length} price option{columns.length === 1 ? "" : "s"} · {subPriceRange}</span>
                                    {hasBaseOnly && <span className="mt-1 block text-[11px] text-[#8c6957]">Base price applies only to rows that do not offer length choices.</span>}
                                  </button>

                                  <button onClick={() => addLengthColumn(subKey, subcategory.name)} className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-[#9a5835] transition hover:bg-[#fbf1e8]">
                                    <Plus className="h-4 w-4" /> Add length
                                  </button>
                                </div>

                                {!subClosed && (
                                  <>
                                    <div className="overflow-x-auto">
                                      <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
                                        <thead className="bg-[#fffdfa]">
                                          <tr>
                                            <th className="sticky left-0 z-30 min-w-[150px] border-b border-[#eee5dc] bg-[#fffdfa] px-5 py-3.5 text-left text-xs font-medium text-neutral-600">{usesServiceLabel ? "Service" : "Size"}</th>
                                            {columns.map(column => (
                                              <th key={column} className="min-w-[112px] border-b border-[#eee5dc] px-3 py-3.5 text-center text-xs font-medium text-neutral-600">{column}</th>
                                            ))}
                                            {hasKnotless && <th className="min-w-[105px] border-b border-[#eee5dc] px-3 py-3.5 text-center text-xs font-medium text-neutral-600">Knotless</th>}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {subRows.map(row => {
                                            const item = row.item;
                                            const isDirty = !!drafts[item.id!];
                                            const usesSeparateKnotless = item.foundationChoicesEnabled && item.knotlessPricingMode === "SEPARATE";
                                            const knotlessInvalid = item.foundationChoicesEnabled && !usesSeparateKnotless
                                              && !hasValidAdjustment(item.knotlessPriceAdjustment);

                                            return (
                                              <tr key={item.id} data-pricing-row-id={item.id} className="group transition hover:bg-[#fdfaf6]">
                                                <td className="sticky left-0 z-20 border-b border-[#f0e8e0] bg-white px-5 py-3.5 group-hover:bg-[#fdfaf6]">
                                                  <span className="block font-medium text-[#321d14]">{item.name}</span>
                                                  {isDirty && <span className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-[#a6613d]"><span className="h-1.5 w-1.5 rounded-full bg-[#b7734d]" />Modified</span>}
                                                </td>

                                                {columns.map(column => {
                                                  const isBase = column === "Base price";
                                                  const optionIndex = isBase ? -1 : (item.lengthOptions ?? []).findIndex(option => option.name === column);
                                                  const optionExists = isBase ? !item.lengthOptions?.length : optionIndex >= 0;
                                                  const value = isBase ? (!item.lengthOptions?.length ? item.price : "") : (optionIndex >= 0 ? item.lengthOptions?.[optionIndex]?.price : "");
                                                  const invalid = optionExists && !hasValidPrice(value);

                                                  return (
                                                    <td key={column} className="border-b border-[#f0e8e0] px-2.5 py-2.5 text-center">
                                                      {!optionExists ? (
                                                        <span className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[#f5f1ec] px-3 text-[11px] font-medium text-neutral-500" title={`${item.name} does not offer ${column}`}>Not offered</span>
                                                      ) : <div title={invalid ? "Missing or invalid price" : undefined} className={`mx-auto flex w-[94px] items-center rounded-lg border bg-[#fffdfa] transition focus-within:bg-white focus-within:ring-3 ${invalid ? "border-amber-300 focus-within:border-amber-400 focus-within:ring-amber-100" : "border-[#eee5dd] hover:border-[#d8c7b9] focus-within:border-[#b7734d] focus-within:ring-[#b7734d]/10"}`}>
                                                        <span className={`pl-2.5 text-xs ${invalid ? "text-amber-600" : "text-neutral-400"}`}>$</span>
                                                        <input
                                                          aria-label={`${item.name} ${column} price`}
                                                          data-pricing-service-id={item.id}
                                                          data-pricing-price-key={column}
                                                          inputMode="decimal"
                                                          value={value ?? ""}
                                                          placeholder="—"
                                                          onFocus={event => event.currentTarget.select()}
                                                          onChange={event => updateItem(item.id!, draft => {
                                                            if (isBase) return { ...draft, price: event.target.value };
                                                            const options = [...(draft.lengthOptions ?? [])];
                                                            const index = options.findIndex(option => option.name === column);
                                                            if (index >= 0) options[index] = { ...options[index], price: event.target.value };
                                                            else options.push({ name: column, price: event.target.value });
                                                            return { ...draft, lengthOptions: options };
                                                          })}
                                                          className={`w-full min-w-0 bg-transparent py-2 pr-2 text-center text-sm font-medium outline-none ${invalid ? "text-amber-800" : "text-[#3a241a]"}`}
                                                        />
                                                        {invalid && <AlertCircle className="mr-2 h-3.5 w-3.5 shrink-0 text-amber-500" />}
                                                      </div>}
                                                    </td>
                                                  );
                                                })}

                                                {hasKnotless && (
                                                  <td className="border-b border-[#f0e8e0] px-3 py-2.5 text-center">
                                                    {usesSeparateKnotless ? (
                                                      <div className="min-w-[185px] space-y-1.5 py-1 text-left">
                                                        {(item.lengthOptions ?? []).map((option, optionIndex) => {
                                                          const invalid = !hasValidPrice(option.knotlessPrice);
                                                          return <label key={option.id ?? option.name} className="flex items-center justify-between gap-2 text-[11px]">
                                                            <span className="max-w-20 truncate text-neutral-500" title={option.name}>{option.name}</span>
                                                            <span className={`flex w-[94px] items-center rounded-lg border bg-[#fffdfa] ${invalid ? "border-amber-300" : "border-[#eee5dd]"}`}>
                                                              <span className="pl-2 text-xs text-neutral-400">$</span>
                                                              <input
                                                                aria-label={`${item.name} Knotless ${option.name} price`}
                                                                data-pricing-service-id={item.id}
                                                                data-pricing-price-key={`Knotless ${option.name}`}
                                                                inputMode="decimal"
                                                                value={option.knotlessPrice ?? ""}
                                                                onFocus={event => event.currentTarget.select()}
                                                                onChange={event => updateItem(item.id!, draft => {
                                                                  const options = [...(draft.lengthOptions ?? [])];
                                                                  options[optionIndex] = { ...options[optionIndex], knotlessPrice: event.target.value };
                                                                  return { ...draft, lengthOptions: options };
                                                                })}
                                                                className="w-full min-w-0 bg-transparent py-2 pr-2 text-center text-sm font-medium outline-none"
                                                              />
                                                            </span>
                                                          </label>;
                                                        })}
                                                      </div>
                                                    ) : item.foundationChoicesEnabled ? (
                                                      <div className={`mx-auto flex w-[94px] items-center rounded-lg border bg-[#fffdfa] ${knotlessInvalid ? "border-amber-300" : "border-[#eee5dd]"} focus-within:border-[#b7734d] focus-within:ring-3 focus-within:ring-[#b7734d]/10`}>
                                                        <span className="pl-2 text-xs text-neutral-400">+$</span>
                                                        <input
                                                          aria-label={`${item.name} Knotless adjustment`}
                                                          data-pricing-service-id={item.id}
                                                          data-pricing-price-key="Knotless adjustment"
                                                          inputMode="decimal"
                                                          value={item.knotlessPriceAdjustment ?? ""}
                                                          onFocus={event => event.currentTarget.select()}
                                                          onChange={event => updateItem(item.id!, draft => ({ ...draft, knotlessPriceAdjustment: event.target.value }))}
                                                          className="w-full min-w-0 bg-transparent py-2 pr-2 text-center text-sm font-medium outline-none"
                                                        />
                                                      </div>
                                                    ) : <span className="text-neutral-300">—</span>}
                                                  </td>
                                                )}
                                              </tr>
                                            );
                                          })}

                                        </tbody>
                                      </table>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {tab === "deposits" && <div className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-neutral-950">Deposit settings</h2>
            <p className="mt-1 text-sm text-neutral-600">Control the authorization amount collected when customers request an appointment.</p>
          </div>

          <section className="rounded-xl border border-[#e1d5c9] bg-white p-5 shadow-sm">
            <div className="grid gap-6 lg:grid-cols-[1fr_1px_1fr]">
              <div className="flex flex-col justify-center">
                <label htmlFor="default-deposit" className="text-base font-semibold">Default deposit</label>
                <div className="mt-3 flex max-w-md rounded-md border border-[#bdaea1] bg-white focus-within:ring-2 focus-within:ring-[#bd7953]/25">
                  <span className="border-r border-[#ded3c8] px-4 py-3">$</span>
                  <input id="default-deposit" inputMode="decimal" value={defaultDepositInput} onFocus={event => event.currentTarget.select()} onChange={event => setDefaultDepositInput(event.target.value)} onBlur={() => {
                    const amount = Number(defaultDepositInput);
                    if (Number.isFinite(amount) && amount > 0 && amount <= 1000) {
                      setDefaultDepositCents(Math.round(amount * 100));
                      setDefaultDepositInput(amount.toFixed(2));
                    } else {
                      setDefaultDepositInput((defaultDepositCents / 100).toFixed(2));
                      setError("Default deposit must be between $0.01 and $1,000.");
                    }
                  }} className="min-w-0 flex-1 bg-transparent px-4 font-medium outline-none" />
                </div>
                <p className="mt-2 text-xs text-neutral-500">Applied to every service unless a service-specific override is set.</p>
                <button disabled={saving} onClick={saveDeposits} className="mt-5 flex w-fit items-center gap-2 rounded-md bg-[#351a10] px-5 py-2.5 text-sm font-medium text-white shadow-sm disabled:opacity-60">
                  <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save deposit settings"}
                </button>
              </div>
              <div className="hidden bg-[#e5dad0] lg:block" />
              <div className="rounded-lg border border-[#e5d9cf] bg-[#fdfaf6] p-5">
                <p className="text-sm font-medium">Customer sees</p>
                <div className="mt-4 flex items-center justify-between border-t border-dashed border-[#ddd0c5] pt-4">
                  <strong className="text-base">Deposit Today</strong>
                  <span className="text-2xl font-semibold text-[#351a10]">${(defaultDepositCents / 100).toFixed(2)}</span>
                </div>
                <p className="mt-4 text-xs text-neutral-500">Remaining balance is calculated from the selected service price.</p>
              </div>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            <section className="overflow-hidden rounded-xl border border-[#e1d5c9] bg-white shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-4 p-5">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-950">Service-specific overrides</h3>
                  <p className="mt-1 text-xs text-neutral-500">Leave a deposit blank to use the default amount.</p>
                </div>
                <button onClick={() => document.querySelector<HTMLInputElement>("[data-deposit-input]")?.focus()} className="flex items-center gap-2 rounded-md border border-[#a46645] px-4 py-2 text-sm font-medium text-[#6b3824]">
                  <Plus className="h-4 w-4" /> Add override
                </button>
              </div>
              <div className="flex flex-wrap gap-3 border-y border-[#eadfd5] bg-[#fdfbf8] p-4">
                <label className="relative min-w-56 flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input value={depositQuery} onChange={event => setDepositQuery(event.target.value)} placeholder="Search services" className="w-full rounded-md border border-[#ddd0c4] bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#bd7953]/20" />
                </label>
                <select value={depositCategory} onChange={event => setDepositCategory(event.target.value)} className="min-w-48 rounded-md border border-[#ddd0c4] bg-white px-3 py-2.5 text-sm outline-none">
                  <option value="all">All categories</option>
                  {data?.categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="bg-[#f7f1ea] text-xs text-neutral-600"><tr>
                    <th className="border-b border-r border-[#e2d7cc] px-4 py-3 font-medium">Service</th>
                    <th className="border-b border-r border-[#e2d7cc] px-4 py-3 font-medium">Standard price range</th>
                    <th className="border-b border-r border-[#e2d7cc] px-4 py-3 font-medium">Deposit</th>
                    <th className="border-b border-r border-[#e2d7cc] px-4 py-3 font-medium">Status</th>
                    <th className="border-b border-[#e2d7cc] px-4 py-3 font-medium">Actions</th>
                  </tr></thead>
                  <tbody>{depositRows.map(({ subcategory, item }) => {
                    const itemPrices = (item.lengthOptions?.length ? item.lengthOptions.map(option => Number(option.price)) : [Number(item.price)]).filter(Number.isFinite);
                    const minimumPriceCents = Math.round(Math.min(...itemPrices) * 100);
                    const maximumPriceCents = Math.round(Math.max(...itemPrices) * 100);
                    const configuredDeposit = depositOverrides[item.id!] ?? defaultDepositCents;
                    const effectiveDeposit = Math.min(configuredDeposit, minimumPriceCents);
                    const isLimited = configuredDeposit > minimumPriceCents;
                    const hasOverride = depositOverrides[item.id!] != null;
                    return <tr key={item.id} className="hover:bg-[#fdfaf6]">
                      <td className="border-b border-r border-[#ece3da] px-4 py-3"><strong className="block">{item.name}</strong><span className="text-xs text-neutral-500">{subcategory.name}</span></td>
                      <td className="border-b border-r border-[#ece3da] px-4 py-3">{minimumPriceCents === maximumPriceCents ? money(String(minimumPriceCents / 100)) : `${money(String(minimumPriceCents / 100))}–${money(String(maximumPriceCents / 100))}`}</td>
                      <td className="border-b border-r border-[#ece3da] px-3 py-2">
                        <div className="flex w-28 rounded-md border border-[#d8cabd] bg-white focus-within:ring-2 focus-within:ring-[#bd7953]/20">
                          <span className="px-2 py-2">$</span>
                          <input data-deposit-input aria-label={`${item.name} deposit override`} inputMode="decimal" value={depositOverrideInputs[item.id!] ?? (hasOverride ? (depositOverrides[item.id!]! / 100).toFixed(2) : "")} placeholder={(defaultDepositCents / 100).toFixed(2)} onFocus={event => event.currentTarget.select()} onChange={event => setDepositOverrideInputs(previous => ({ ...previous, [item.id!]: event.target.value }))} onBlur={() => {
                            const raw = depositOverrideInputs[item.id!] ?? "";
                            if (!raw.trim()) {
                              setDepositOverrides(previous => ({ ...previous, [item.id!]: null }));
                              return;
                            }
                            const amount = Number(raw);
                            if (Number.isFinite(amount) && amount > 0 && amount <= 1000) {
                              setDepositOverrides(previous => ({ ...previous, [item.id!]: Math.round(amount * 100) }));
                              setDepositOverrideInputs(previous => ({ ...previous, [item.id!]: amount.toFixed(2) }));
                            } else {
                              setDepositOverrideInputs(previous => ({ ...previous, [item.id!]: hasOverride ? (depositOverrides[item.id!]! / 100).toFixed(2) : "" }));
                              setError(`${item.name} deposit must be between $0.01 and $1,000.`);
                            }
                          }} className="min-w-0 flex-1 bg-transparent py-2 pr-2 outline-none" />
                        </div>
                      </td>
                      <td className="border-b border-r border-[#ece3da] px-4 py-3 text-xs">{isLimited ? "Limited to service price" : hasOverride ? "Custom override" : "Uses default"}</td>
                      <td className="border-b border-[#ece3da] px-4 py-3">
                        <button onClick={() => document.querySelector<HTMLInputElement>(`[aria-label="${item.name} deposit override"]`)?.focus()} className="font-medium text-[#6f3b27] underline underline-offset-4">Edit</button>
                        {hasOverride && <><span className="mx-2 text-neutral-300">·</span><button onClick={() => { setDepositOverrides(previous => ({ ...previous, [item.id!]: null })); setDepositOverrideInputs(previous => ({ ...previous, [item.id!]: "" })); }} className="font-medium text-[#6f3b27] underline underline-offset-4">Remove</button></>}
                        <span className="sr-only">Effective deposit ${(effectiveDeposit / 100).toFixed(2)}</span>
                      </td>
                    </tr>;
                  })}</tbody>
                </table>
                {!depositRows.length && <div className="p-10 text-center text-sm text-neutral-500">No services match these filters.</div>}
              </div>
              <div className="m-4 flex gap-3 rounded-md border border-[#e1b36a] bg-[#fff8e9] px-4 py-3 text-sm text-[#6d4a20]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> A deposit can never exceed the selected appointment price.
              </div>
            </section>

            <aside className="h-fit rounded-xl border border-[#e1d5c9] bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-950">Authorization behavior</h3>
              <div className="mt-6 space-y-5">
                {["Authorize now, capture after admin approval", "Release authorization when denied", "Warn when authorization is close to expiring"].map(text => <div key={text} className="flex gap-3 text-sm leading-5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#351a10] text-white"><Check className="h-4 w-4" /></span><span>{text}</span>
                </div>)}
              </div>
            </aside>
          </div>
        </div>}

        {tab === "history" && <div className="rounded-xl border border-[#e4d8cc] bg-white p-6"><div className="flex items-center gap-3"><History className="h-5 w-5 text-[#ad6b45]" /><h3 className="text-lg font-semibold">Pricing activity</h3></div>{history.length ? <div className="mt-5 divide-y">{history.map(entry => <div key={entry.id} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr_1.5fr]"><span className="text-xs text-neutral-500">{new Date(entry.createdAt).toLocaleString()}</span><span><strong className="block text-sm">{entry.serviceName}</strong><span className="text-xs font-medium text-[#ad6b45]">{entry.action.replaceAll("_", " ")}</span>{entry.changedBy && <span className="mt-1 block text-xs text-neutral-500">by {entry.changedBy}</span>}</span><span className="text-sm text-neutral-600">{entry.summary}</span></div>)}</div> : <div className="py-14 text-center text-sm text-neutral-500">No pricing changes have been recorded yet.</div>}</div>}
      </div>

      {false && showPricingIssues && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[#28170f]/20 backdrop-blur-[1px]"
          onMouseDown={event => { if (event.target === event.currentTarget) setShowPricingIssues(false); }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="pricing-issues-title"
            className="flex h-full w-full max-w-[430px] flex-col border-l border-[#e4d8cc] bg-[#fffdf9] shadow-[-20px_0_55px_rgba(45,24,15,.14)]"
          >
            <div className="flex items-start justify-between gap-5 border-b border-[#eee4da] px-6 py-6">
              <div>
                <h2 id="pricing-issues-title" className="text-xl font-semibold text-[#2d180f]">Pricing issues</h2>
                <p className="mt-1 text-sm text-neutral-500">{pricingIssues.length} issue{pricingIssues.length === 1 ? "" : "s"} across {pricingIssueGroups.length} service group{pricingIssueGroups.length === 1 ? "" : "s"}</p>
              </div>
              <button type="button" aria-label="Close pricing issues" onClick={() => setShowPricingIssues(false)} className="rounded-lg p-2 text-neutral-500 transition hover:bg-[#f3ebe3] hover:text-[#351a10]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
              {pricingIssueGroups.map(group => {
                const groupKey = group.category.slug || String(group.category.id);
                const collapsed = collapsedIssueGroups.has(groupKey);
                return (
                  <section key={groupKey} className="overflow-hidden rounded-xl border border-[#e8ddd2] bg-white shadow-[0_4px_14px_rgba(45,24,15,.035)]">
                    <button
                      type="button"
                      onClick={() => setCollapsedIssueGroups(previous => {
                        const next = new Set(previous);
                        next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
                        return next;
                      })}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#fdf9f5]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5eadf] text-[#7e4a30]">
                        <AlertCircle className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 font-semibold text-[#3b2117]">{group.category.name}</span>
                      <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[#f4eadf] px-2 text-xs font-semibold text-[#704027]">{group.issues.length}</span>
                      {collapsed ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronUp className="h-4 w-4 text-neutral-400" />}
                    </button>

                    {!collapsed && (
                      <div className="divide-y divide-[#f0e8e0] border-t border-[#eee4da]">
                        {group.issues.map((issue, index) => (
                          <div key={`${issue.item.id}-${issue.option ?? "base"}-${index}`} className="flex items-start gap-3 px-4 py-3.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c58b59]" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm leading-5 text-[#4d352a]">
                                <span className="font-medium">{issue.subcategory.name}</span>
                                <span className="text-neutral-400"> → </span>
                                {issue.item.name}
                              </p>
                              <p className="mt-0.5 text-xs text-neutral-500">{issue.option ? `${issue.option} price` : "Missing base price"}</p>
                            </div>
                            <button type="button" onClick={() => jumpToPricingIssue(issue)} className="inline-flex shrink-0 items-center gap-0.5 pt-0.5 text-xs font-semibold text-[#8d4f31] underline decoration-[#d4b39d] underline-offset-4 hover:text-[#5f321f]">
                              Fix <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>

            <div className="border-t border-[#eee4da] bg-[#fffaf5] p-5">
              <button
                type="button"
                onClick={() => {
                  setTab("matrix");
                  setQuery("");
                  setCategoryFilter("all");
                  setCollapsedCategories(new Set());
                  setCollapsedSubcategories(new Set());
                  setShowPricingIssues(false);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#351a10] px-5 py-3 text-sm font-medium text-white shadow-[0_8px_20px_rgba(53,26,16,.14)] transition hover:bg-[#472317]"
              >
                Review all issues <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </aside>
        </div>
      )}

      {addLengthTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#28170f]/25 p-4 backdrop-blur-[1px]" onMouseDown={event => { if (event.target === event.currentTarget) setAddLengthTarget(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="add-length-title" className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-[#dfd1c4] bg-[#fffdf9] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="add-length-title" className="text-xl font-semibold text-[#2d180f]">Add a length</h2>
                <p className="mt-1 text-sm text-neutral-500">Set the customer-facing price separately for every size in {addLengthTarget.subcategoryName}.</p>
              </div>
              <button type="button" aria-label="Close add length dialog" onClick={() => setAddLengthTarget(null)} className="rounded-lg p-2 text-neutral-500 hover:bg-[#f3ebe3]"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-6 min-h-0 space-y-5 overflow-y-auto pr-1">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#6b4b3c]">Length name</span>
                <input autoFocus value={newLengthName} onChange={event => setNewLengthName(event.target.value)} placeholder="e.g. Mid-Back" className="w-full rounded-xl border border-[#d9cabd] bg-white px-4 py-3 outline-none focus:border-[#a46645] focus:ring-4 focus:ring-[#b7734d]/10" />
              </label>
              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#6b4b3c]">Price by size</span>
                <div className="divide-y divide-[#eee5dc] overflow-hidden rounded-xl border border-[#d9cabd] bg-white">
                  {rows.filter(row => row.groupKey === addLengthTarget.groupKey && row.item.id).map(row => (
                    <div key={row.item.id} className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_9rem_9rem]">
                      <span className="min-w-0 flex-1 text-sm font-medium text-[#351a10]">{row.item.name}</span>
                      <label className="text-xs font-medium text-neutral-500">Regular
                        <input aria-label={`${row.item.name} new length price`} inputMode="decimal"
                          value={newLengthPrices[row.item.id!] ?? ""}
                          onChange={event => setNewLengthPrices(previous => ({ ...previous, [row.item.id!]: event.target.value }))}
                          onFocus={event => event.currentTarget.select()} placeholder="$0.00"
                          className="mt-1 w-full rounded-lg border border-[#e1d5c9] px-3 py-2 text-right text-sm normal-case outline-none focus:border-[#a46645] focus:ring-3 focus:ring-[#b7734d]/10" />
                      </label>
                      {row.item.foundationChoicesEnabled && row.item.knotlessPricingMode === "SEPARATE" ?
                        <label className="text-xs font-medium text-neutral-500">Knotless
                          <input aria-label={`${row.item.name} new Knotless length price`} inputMode="decimal"
                            value={newLengthKnotlessPrices[row.item.id!] ?? ""}
                            onChange={event => setNewLengthKnotlessPrices(previous => ({ ...previous, [row.item.id!]: event.target.value }))}
                            onFocus={event => event.currentTarget.select()} placeholder="$0.00"
                            className="mt-1 w-full rounded-lg border border-[#e1d5c9] px-3 py-2 text-right text-sm normal-case outline-none focus:border-[#a46645] focus:ring-3 focus:ring-[#b7734d]/10" />
                        </label> : <span />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-7 flex justify-end gap-3">
              <button type="button" onClick={() => setAddLengthTarget(null)} className="rounded-xl border border-[#d9cabd] bg-white px-5 py-3 text-sm font-medium">Cancel</button>
              <button type="button" disabled={saving} onClick={() => void submitAddLength()} className="rounded-xl bg-[#351a10] px-5 py-3 text-sm font-medium text-white disabled:opacity-60">{saving ? "Adding…" : "Add length and prices"}</button>
            </div>
          </section>
        </div>
      )}

      {dirtyIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e4d8cc] bg-[#fffdf9]/95 px-3 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_35px_rgba(45,24,15,.10)] backdrop-blur md:left-64 md:px-4">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d6b999] bg-white font-serif text-xl text-[#351a10]">{dirtyPriceCount || dirtyIds.length}</span>
              <div>
                <p className="text-sm font-semibold text-[#351a10]">{dirtyPriceCount || dirtyIds.length} price{(dirtyPriceCount || dirtyIds.length) === 1 ? "" : "s"} changed</p>
                <p className="mt-0.5 text-xs text-neutral-500">Review your changes before saving.</p>
              </div>
            </div>
            <button onClick={() => setDrafts({})} className="rounded-xl border border-[#d9cabd] bg-white px-6 py-2.5 text-sm font-medium text-[#351a10] hover:bg-[#fbf7f2]">Discard</button>
            <button disabled={saving} onClick={save} className="flex items-center gap-2 rounded-xl bg-[#351a10] px-6 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_rgba(53,26,16,.16)] disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "Saving…" : `Save ${dirtyPriceCount || dirtyIds.length} change${(dirtyPriceCount || dirtyIds.length) === 1 ? "" : "s"}`}</button>
          </div>
        </div>
      )}
    </div>
  );
}
