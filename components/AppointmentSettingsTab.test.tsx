import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AppointmentSettingsTab from "./AppointmentSettingsTab";

const saved = { version: 4, slotDurationMinutes: 60, advanceBookingDays: 60, maxAppointmentsPerSlot: 1, requireApproval: true, allowSameDayBooking: true, bufferTimeBetweenAppointments: 0, timezone: "America/Chicago" };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("appointment settings", () => {
    it("does not show default settings after a failed load", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
        render(<AppointmentSettingsTab />);
        expect(await screen.findByRole("alert")).toHaveTextContent("Could not load saved settings");
        expect(screen.queryByText("Appointment Configuration")).toBeNull();
        expect(screen.queryByText("Save Settings")).toBeNull();
    });
    it("saves the toggle and uses the returned version on the next save", async () => {
        const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => saved })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ ...saved, version: 5, requireApproval: false }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ ...saved, version: 6, requireApproval: false }) });
        vi.stubGlobal("fetch", fetch);
        render(<AppointmentSettingsTab />);
        await screen.findByText("Appointment Configuration");
        fireEvent.click(screen.getAllByRole("switch")[0]);
        fireEvent.click(screen.getAllByText("Save Settings")[0]);
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
        expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ version: 4, requireApproval: false, timezone: "America/Chicago", bufferTimeBetweenAppointments: 0 });
        await waitFor(() => expect(screen.getAllByText("Save Settings")[0]).not.toBeDisabled());
        fireEvent.click(screen.getAllByText("Save Settings")[0]);
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
        expect(JSON.parse(fetch.mock.calls[2][1].body).version).toBe(5);
    });
    it("reloads current settings after a conflict", async () => {
        const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => saved })
            .mockResolvedValueOnce({ ok: false, status: 409 })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ ...saved, version: 7 }) });
        vi.stubGlobal("fetch", fetch);
        render(<AppointmentSettingsTab />);
        await screen.findByText("Appointment Configuration");
        fireEvent.click(screen.getAllByText("Save Settings")[0]);
        expect((await screen.findAllByText(/saved values have been reloaded/)).length).toBeGreaterThan(0);
        expect(fetch).toHaveBeenCalledTimes(3);
    });
});
