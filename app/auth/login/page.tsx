import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signInWithGoogle } from "@/lib/auth/actions";
import { getSafeNextPath } from "@/lib/auth/paths";
import { AuthShell } from "../shell";
import { RequestOtpForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log in or sign up",
  description: "Log in or create your Direct2Hub account with an email code or Google. New accounts get ₹100 in their wallet.",
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; reason?: string; mode?: string }>;
};

/**
 * One page for both: an email code (or Google) signs existing users in and
 * creates the account for a new email (signInWithOtp with shouldCreateUser).
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, reason, mode } = await searchParams;
  const safeNext = getSafeNextPath(next);
  // Sent here from Add to cart, the cart or checkout: say why.
  const purchaseNotice = reason === "purchase";
  // From "Register" / "Sign up" links: lead with account creation.
  const signup = mode === "signup";

  return (
    <AuthShell
      heading={signup ? "Create your Direct2Hub account in seconds." : "Log in or sign up to trade with verified businesses."}
      steps={[
        "Enter your email — we send a 6-digit code, no password needed.",
        "New email? Your account is created automatically, with ₹100 in your wallet.",
        "Enter the code here, or continue with Google instead.",
      ]}
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{signup ? "Create your account" : "Log in or sign up"}</CardTitle>
          <CardDescription>
            {signup
              ? "Use your email or Google account. No password needed."
              : "Same steps for new and returning users — use your email or Google account."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="flex items-center gap-2 rounded-lg border border-brand-200 bg-linear-to-r from-brand-50 to-card px-3 py-2 text-sm">
            <span aria-hidden>🎁</span>
            <span>
              <strong className="text-primary">₹100 welcome bonus</strong> in your wallet when you sign up.
            </span>
          </p>
          {purchaseNotice ? (
            <Alert>
              <AlertDescription>
                Log in to add products to your cart and place your order.
              </AlertDescription>
            </Alert>
          ) : null}
          <RequestOtpForm next={safeNext} />
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={safeNext} />
            <Button type="submit" variant="outline" className="w-full">
              Continue with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
