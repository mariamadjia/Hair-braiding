import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminAlert, AdminButton, AdminEmptyState, AdminPageHeader } from "./AdminUI";

describe("admin UI primitives", () => {
  it("provides one heading hierarchy and action region", () => {
    render(<AdminPageHeader title="Appointments" description="Manage requests." actions={<AdminButton variant="primary">Add</AdminButton>} />);
    expect(screen.getByRole("heading", { level: 1, name: "Appointments" })).toHaveClass("admin-page-title");
    expect(screen.getByRole("button", { name: "Add" })).toHaveClass("admin-button-primary");
  });

  it("uses semantic roles for feedback and empty states", () => {
    render(<><AdminAlert tone="error">Could not save.</AdminAlert><AdminEmptyState title="Nothing here" description="Add the first item." /></>);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save.");
    expect(screen.getByRole("heading", { level: 3, name: "Nothing here" })).toBeInTheDocument();
  });
});
