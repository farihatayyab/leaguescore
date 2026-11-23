import Link from "next/link";
import { isResetTokenValid } from "@/lib/passwordReset";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const dynamic = "force-dynamic";
// Token URL mein hai: referrer na jaye aur search engines index na karein
export const metadata = { title: "Reset password", referrer: "no-referrer", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }) {
  const { token } = await searchParams;
  const t = Array.isArray(token) ? token[0] : token;
  let valid = false;
  try {
    valid = await isResetTokenValid(t);
  } catch (e) {
    console.error("reset page error:", e);
  }

  return (
    <div className="auth-page">
      <div className="modal static">
        <div className="modal-logo">League<b>Score</b></div>
        {valid ? (
          <>
            <p className="modal-sub">Choose a new password for your account.</p>
            <ResetPasswordForm token={t} />
          </>
        ) : (
          <>
            <p className="modal-sub">This password reset link is invalid or has expired.</p>
            <p className="form-error">Reset links work only once and expire after a short time.</p>
            <Link href="/forgot-password" className="btn-grad inline">Request a new link</Link>
          </>
        )}
        <p className="modal-foot"><Link href="/login">Back to log in</Link></p>
      </div>
    </div>
  );
}
