"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { CheckCircle, type IconProps } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { Menu } from "@/components/ui/Menu";
import type { SurveyStatus } from "@/lib/studio/types";

export type TopAction = {
  label: string;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  Icon?: ComponentType<IconProps>;
  /** Put the icon after the label (for "Next: …" arrows). */
  iconAfter?: boolean;
  /** Shown but not usable; the reason appears as a tooltip and under the button on phones. */
  disabledReason?: string;
  /** While disabled: what a click does instead (for example, go to the first thing to fix). */
  onDisabledClick?: () => void;
};

function ActionButton({ action, variant }: { action: TopAction; variant: "primary" | "secondary" }) {
  const cls = `btn btn--md btn--${variant}`;
  const icon = action.Icon && <action.Icon size={18} weight={variant === "primary" ? "bold" : "regular"} />;
  const body = (
    <>
      {!action.iconAfter && icon}
      {action.label}
      {action.iconAfter && icon}
    </>
  );
  if (action.disabledReason)
    return (
      <button type="button" className={cls} aria-disabled="true" title={action.disabledReason} aria-describedby="topbar-disabled-reason" onClick={action.onDisabledClick}>
        {body}
      </button>
    );
  if (action.href && action.external)
    return (
      <a className={cls} href={action.href} target="_blank" rel="noopener">
        {body}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  if (action.href)
    return (
      <Link className={cls} href={action.href}>
        {body}
      </Link>
    );
  return (
    <button type="button" className={cls} onClick={action.onClick}>
      {body}
    </button>
  );
}

/**
 * Studio top bar (UI_UX_LAYOUT.md §3.3), 64px: breadcrumb, status badge and save state on the
 * left, page actions on the right. On phones the secondary actions move into a ⋯ menu and the
 * primary action becomes a sticky button at the bottom.
 */
export function TopBar({
  crumbs,
  status,
  saved,
  primary,
  secondary = [],
}: {
  crumbs: { label: string; href?: string }[];
  status?: SurveyStatus;
  saved?: boolean;
  primary?: TopAction;
  secondary?: TopAction[];
}) {
  const router = useRouter();
  return (
    <>
      <header className="topbar">
        <Link href="/app" className="topbar__mark" aria-label="Studio home">
          <span className="logo__mark" aria-hidden="true" />
        </Link>
        <nav aria-label="Breadcrumb" className="topbar__crumbs">
          <ol>
            {crumbs.map((c, i) => (
              <li key={`${c.label}-${i}`}>
                {c.href && i < crumbs.length - 1 ? (
                  <Link href={c.href}>{c.label}</Link>
                ) : (
                  <span aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        {status && <Badge kind={status} />}
        {saved && (
          <span className="topbar__saved">
            <CheckCircle size={16} weight="regular" /> Saved
          </span>
        )}
        <div className="topbar__actions">
          {secondary.map((a) => (
            <ActionButton key={a.label} action={a} variant="secondary" />
          ))}
          {primary && <ActionButton action={primary} variant="primary" />}
        </div>
        {secondary.length > 0 && (
          <div className="topbar__more">
            <Menu
              label="More actions"
              items={secondary.map((a) => ({
                label: a.label,
                Icon: a.Icon,
                onSelect: () => {
                  if (a.onClick) a.onClick();
                  else if (a.href && a.external) window.open(a.href, "_blank", "noopener");
                  else if (a.href) router.push(a.href);
                },
              }))}
            />
          </div>
        )}
      </header>
      {primary?.disabledReason && (
        <p id="topbar-disabled-reason" className="sr-only">
          {primary.disabledReason}
        </p>
      )}
      {primary && (
        <div className="mobile-primary">
          <ActionButton action={primary} variant="primary" />
          {primary.disabledReason && <p className="mobile-primary__reason">{primary.disabledReason}</p>}
        </div>
      )}
    </>
  );
}
