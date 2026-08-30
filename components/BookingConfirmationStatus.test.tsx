import { describe, expect, it } from "vitest";
import { bookingStatusMessage } from "./BookingConfirmationStatus";

describe("booking confirmation messaging", () => {
    it("waits for actual booking confirmation", () => {
        expect(bookingStatusMessage({ appointmentStatus: "PENDING", paymentStatus: "CAPTURED", requireApproval: false }).title).toBe("Confirmation processing");
        expect(bookingStatusMessage({ appointmentStatus: "APPROVED", paymentStatus: "CAPTURED" }).title).toBe("Appointment confirmed");
    });
    it("distinguishes manual review from capture processing", () => {
        expect(bookingStatusMessage({ appointmentStatus: "PENDING", paymentStatus: "AUTHORIZED", requireApproval: true }).title).toBe("Awaiting salon approval");
        expect(bookingStatusMessage({ appointmentStatus: "PENDING", paymentStatus: "AUTHORIZED", requireApproval: true, approvalRequested: true }).title).toBe("Confirmation processing");
    });
    it("never calls a failed or cancelled booking confirmed", () => {
        expect(bookingStatusMessage({ appointmentStatus: "CANCELLED", paymentStatus: "CAPTURED" }).title).toBe("Booking not confirmed");
        expect(bookingStatusMessage({ appointmentStatus: "PENDING", paymentStatus: "CAPTURE_FAILED" }).title).toBe("Confirmation needs attention");
    });
});
