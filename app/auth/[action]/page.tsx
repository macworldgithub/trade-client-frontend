import { notFound } from "next/navigation";
import AccountRecovery from "../../../components/AccountRecovery";

export default function RecoveryPage({ params }: { params: { action: string } }) {
  const action = params.action;
  if (action !== "verify-email" && action !== "reset-password" && action !== "forgot-password" && action !== "resend-verification" && action !== "recover-account") notFound();
  return <AccountRecovery mode={action} />;
}

export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
