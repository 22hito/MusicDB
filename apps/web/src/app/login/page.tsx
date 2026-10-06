import { Suspense } from "react";
import { AuthForm } from "@/components/pages/auth";

export const metadata = { title: "Вхід" };

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
