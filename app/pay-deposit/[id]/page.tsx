import DepositPaymentClient from "./DepositPaymentClient";

export default async function DepositPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DepositPaymentClient appointmentId={Number(id)} />;
}
