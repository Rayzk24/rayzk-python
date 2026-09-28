import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

type Option = { value: string; label: string };

export function LibraryFilterSelect({
  label,
  value,
  options,
  onChange,
  align = "left",
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = Math.max(0, options.findIndex((option) => option.value === value));

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: Event) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
    };
  }, [open]);

  function focusOption(index: number) {
    setActive(index);
    requestAnimationFrame(() => menu.current?.querySelectorAll<HTMLElement>("[role=option]")[index]?.focus());
  }
  function openMenu() {
    setActive(selected);
    setOpen(true);
    requestAnimationFrame(() => menu.current?.querySelectorAll<HTMLElement>("[role=option]")[selected]?.focus());
  }
  function choose(next: string) {
    onChange(next);
    setOpen(false);
    trigger.current?.focus();
  }
  function handleKey(event: KeyboardEvent) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) openMenu();
      else focusOption((active + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    } else if ((event.key === "Enter" || event.key === " ") && open && event.target !== trigger.current) {
      event.preventDefault();
      choose(options[active]?.value ?? "");
    }
  }

  return (
    <div className={`library-select align-${align}`} ref={root} onKeyDown={handleKey}>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-expanded={open}
        className={`library-select-trigger ${open ? "open" : ""}`}
        onClick={() => open ? setOpen(false) : openMenu()}
      >
        <span>{options[selected]?.label}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div id={listId} ref={menu} role="listbox" aria-label={label} className="library-select-menu">
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={option.value === value}
              className={index === active ? "active" : ""}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
