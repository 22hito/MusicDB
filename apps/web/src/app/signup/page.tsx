import { Suspense } from "react";
import { AuthForm } from "@/components/pages/auth";

export const metadata = { title: "Реєстрація" };

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
