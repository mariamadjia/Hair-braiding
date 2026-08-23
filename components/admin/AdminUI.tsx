import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export const adminUi = {
  page: "admin-page",
  pageHeader: "admin-page-header",
  pageTitle: "admin-page-title",
  pageDescription: "admin-page-description",
  section: "admin-section",
  card: "admin-card",
  cardHeader: "admin-card-header",
  cardTitle: "admin-card-title",
  label: "admin-label",
  input: "admin-input",
  select: "admin-input admin-select",
  helper: "admin-helper",
  primaryButton: "admin-button admin-button-primary",
  secondaryButton: "admin-button admin-button-secondary",
  dangerButton: "admin-button admin-button-danger",
  iconButton: "admin-icon-button",
  table: "admin-table",
  modalOverlay: "admin-modal-overlay",
  modal: "admin-modal",
} as const;

export function AdminPage({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <main className={`${adminUi.page} ${className}`} {...props} />;
}

export function AdminPageHeader({ title, description, eyebrow, actions, className = "" }: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`${adminUi.pageHeader} ${className}`}>
      <div className="min-w-0">
        {eyebrow && <div className="admin-eyebrow">{eyebrow}</div>}
        <h1 className={adminUi.pageTitle}>{title}</h1>
        {description && <p className={adminUi.pageDescription}>{description}</p>}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </header>
  );
}

export function AdminCard({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`${adminUi.card} ${className}`} {...props} />;
}

export function AdminButton({ variant = "secondary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const variantClass = variant === "primary" ? adminUi.primaryButton : variant === "danger" ? adminUi.dangerButton : adminUi.secondaryButton;
  return <button className={`${variantClass} ${className}`} {...props} />;
}

export function AdminAlert({ tone = "info", children, className = "" }: { tone?: "info" | "success" | "warning" | "error"; children: ReactNode; className?: string }) {
  return <div role={tone === "error" ? "alert" : "status"} className={`admin-alert admin-alert-${tone} ${className}`}>{children}</div>;
}

export function AdminEmptyState({ title, description, action, className = "" }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return <div className={`admin-empty-state ${className}`}><h3>{title}</h3>{description && <p>{description}</p>}{action && <div>{action}</div>}</div>;
}
