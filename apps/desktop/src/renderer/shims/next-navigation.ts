/** next/navigation для застосунку поверх react-router (лише те, що використовує код сайту). */
import { useMemo } from "react";
import { useLocation, useNavigate, useParams as useRouterParams } from "react-router";

export function useRouter() {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      push: (href: string, _opts?: { scroll?: boolean }) => navigate(href),
      replace: (href: string, _opts?: { scroll?: boolean }) => navigate(href, { replace: true }),
      back: () => navigate(-1),
      forward: () => navigate(1),
      refresh: () => {},
      prefetch: (_href: string) => {},
    }),
    [navigate],
  );
}

export function usePathname(): string {
  return useLocation().pathname;
}

export function useSearchParams(): URLSearchParams {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  return useRouterParams() as T;
}

export class NotFoundError extends Error {}
export function notFound(): never {
  throw new NotFoundError("not found");
}
export function redirect(href: string): never {
  location.assign(href);
  throw new Error("redirect");
}
export const permanentRedirect = redirect;
