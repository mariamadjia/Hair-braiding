const VARIABLE_LABELS: Record<string, string> = {
  customerFirstName: "Customer first name",
  customerFullName: "Customer full name",
  customerEmail: "Customer email",
  customerPhone: "Customer phone",
  serviceName: "Service name",
  appointmentDate: "Appointment date",
  appointmentTime: "Appointment time",
  appointmentShortDate: "Short appointment date",
  depositAmount: "Deposit amount",
  remainingBalance: "Remaining balance",
  managementUrl: "Manage appointment link",
  paymentUrl: "Payment link",
  salonName: "Salon name",
  salonPhone: "Salon phone",
  salonEmail: "Salon email",
  website: "Website link",
  reason: "Reason",
  feeAmount: "Fee amount",
  paymentReference: "Payment reference",
  adminBookingsUrl: "Admin bookings link",
  customerCancellationReason: "Customer cancellation reason",
  paymentOutcome: "Payment outcome",
};

export const friendlyVariableLabel = (key: string) =>
  VARIABLE_LABELS[key] ?? key;

export const friendlyTemplate = (value: string) =>
  value.replace(/\{\{([A-Za-z][A-Za-z0-9]*)}}/g, (token, key: string) =>
    VARIABLE_LABELS[key] ? `[${VARIABLE_LABELS[key]}]` : token,
  );

export const technicalTemplate = (value: string) =>
  Object.entries(VARIABLE_LABELS).reduce(
    (result, [key, label]) => result.replaceAll(`[${label}]`, `{{${key}}}`),
    value,
  );
