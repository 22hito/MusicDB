/** next/link для застосунку: внутрішні адреси — react-router, зовнішні — звичайне посилання (відкриється в браузері). */
import { type AnchorHTMLAttributes, forwardRef, type ReactNode } from "react";
import { Link as RouterLink } from "react-router";

type Href =
  | string
  | { pathname?: string; query?: Record<string, string | number | undefined>; hash?: string };

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: Href;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean | null;
  children?: ReactNode;
};

export function hrefToString(href: Href): string {
  if (typeof href === "string") return href;
  const q = href.query
    ? `?${new URLSearchParams(
        Object.entries(href.query)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      )}`
    : "";
  return `${href.pathname ?? ""}${q}${href.hash ? `#${href.hash}` : ""}`;
}

const Link = forwardRef<HTMLAnchorElement, Props>(function Link(
  { href, replace, scroll: _scroll, prefetch: _prefetch, children, ...rest },
  ref,
) {
  const to = hrefToString(href);
  if (/^[a-z][a-z0-9+.-]*:/i.test(to)) {
    return (
      <a ref={ref} href={to} target="_blank" rel="noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <RouterLink ref={ref} to={to} replace={replace} {...rest}>
      {children}
    </RouterLink>
  );
});

export default Link;
