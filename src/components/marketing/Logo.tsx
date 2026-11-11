import Link from "next/link";

/** Clay mark + "PlaySurvey" wordmark (UI_UX_LAYOUT.md §3.1). */
export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" className="logo" onClick={onClick} aria-label="PlaySurvey home">
      <span className="logo__mark" aria-hidden="true" />
      <span>PlaySurvey</span>
    </Link>
  );
}
