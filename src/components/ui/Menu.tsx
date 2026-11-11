"use client";

import type { ComponentType, KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { DotsThree, type IconProps } from "@/components/icons";

export type MenuItem = {
  label: string;
  Icon?: ComponentType<IconProps>;
  danger?: boolean;
  onSelect: () => void;
};

/**
 * Overflow (⋯) menu: a menu button with arrow-key navigation. Esc or a click outside closes it
 * and focus returns to the button.
 */
export function Menu({ label, items, align = "end" }: { label: string; items: MenuItem[]; align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent) {
    const list = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      list[(i + 1) % list.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      list[(i - 1 + list.length) % list.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      list[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      list[list.length - 1]?.focus();
    } else if (e.key === "Tab") {
      close(false);
    }
  }

  return (
    <div ref={wrapRef} className="menu">
      <button
        ref={buttonRef}
        type="button"
        className="menu__button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <DotsThree size={20} />
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label={label} className={`menu__list menu__list--${align}`} onKeyDown={onKeyDown}>
          {items.map((item, i) => (
            <button
              key={item.label}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={`menu__item ${item.danger ? "is-danger" : ""}`}
              onClick={() => {
                close();
                item.onSelect();
              }}
            >
              {item.Icon && <item.Icon size={18} weight="regular" />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
