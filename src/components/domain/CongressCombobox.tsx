"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, ChevronsUpDown, Check } from "lucide-react";
import type { CongressData } from "@/lib/validators/congress";

interface CongressComboboxProps {
  congresses: CongressData[];
  value: string | null;
  onChange: (congressId: string | null) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}

export function CongressCombobox({
  congresses,
  value,
  onChange,
  id,
  placeholder = "Selecciona un congreso",
  className = "",
}: CongressComboboxProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = congresses.find((c) => c.id === value);

  const filtered =
    search.trim() === ""
      ? congresses
      : congresses.filter(
          (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.institutionName ?? "").toLowerCase().includes(search.toLowerCase()),
        );

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent): void {
      if (containerRef.current !== null && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [closeDropdown]);

  useEffect(() => {
    if (open && searchRef.current !== null) {
      searchRef.current.focus();
    }
  }, [open]);

  function handleToggle(): void {
    setOpen((prev) => !prev);
    if (open) setSearch("");
  }

  function handleSelect(congressId: string): void {
    onChange(congressId === value ? null : congressId);
    closeDropdown();
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === "Escape") {
      closeDropdown();
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-sm ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={selected !== undefined ? selected.name : placeholder}
        onClick={handleToggle}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-white)] px-3 font-secondary text-sm text-[var(--color-text-primary-black)] transition-colors duration-200 hover:border-[var(--color-text-secondary)] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        data-testid="congress-combobox-trigger"
      >
        <span
          className={
            selected !== undefined ? "" : "text-[var(--color-text-secondary)]"
          }
        >
          {selected !== undefined ? selected.name : placeholder}
        </span>
        <ChevronsUpDown
          size={15}
          strokeWidth={1.5}
          className="shrink-0 text-[var(--color-text-secondary)]"
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full min-w-[240px] animate-scale-in rounded-md border border-[var(--color-border)] bg-[var(--color-white)] shadow-[var(--shadow-high)]"
          role="dialog"
          aria-label="Buscar congreso"
        >
          {/* Search bar */}
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
            <Search
              size={14}
              strokeWidth={1.5}
              className="shrink-0 text-[var(--color-text-secondary)]"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar congreso..."
              className="flex-1 bg-transparent font-secondary text-sm text-[var(--color-text-primary-black)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
              data-testid="congress-combobox-search"
              aria-label="Buscar congreso"
            />
          </div>

          {/* Options list */}
          <ul
            role="listbox"
            className="max-h-60 overflow-y-auto py-1"
            aria-label="Lista de congresos"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2.5 font-secondary text-sm text-[var(--color-text-secondary)]">
                No se encontraron congresos.
              </li>
            ) : (
              filtered.map((congress) => (
                <li
                  key={congress.id}
                  role="option"
                  aria-selected={congress.id === value}
                  onClick={() => handleSelect(congress.id)}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2.5 font-secondary text-sm text-[var(--color-text-primary-black)] transition-colors duration-150 hover:bg-[var(--color-surface)]"
                  data-testid="congress-combobox-option"
                >
                  <Check
                    size={14}
                    strokeWidth={2}
                    className={
                      congress.id === value
                        ? "text-[var(--color-primary)]"
                        : "invisible"
                    }
                    aria-hidden="true"
                  />
                  <span className="truncate">{congress.name}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
