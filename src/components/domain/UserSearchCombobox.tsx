"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UserListSchema, type UserData } from "@/lib/validators/user";

interface UserSearchComboboxProps {
  onSelect: (user: UserData | null) => void;
  selected: UserData | null;
  congressId?: string | undefined;
  placeholder?: string;
  /** When true, loads the full enrolled list immediately on mount (before any query). */
  preloadEnrolled?: boolean;
  "data-testid"?: string;
}

export function UserSearchCombobox({
  onSelect,
  selected,
  congressId,
  placeholder = "Buscar por nombre, correo o identificacion...",
  preloadEnrolled = false,
  "data-testid": testId,
}: UserSearchComboboxProps): React.ReactElement {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserData[]>([]);
  const [allEnrolled, setAllEnrolled] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSelection = useCallback(() => {
    onSelect(null);
    setQuery("");
    setResults([]);
    setOpen(false);
  }, [onSelect]);

  const loadAllEnrolled = useCallback(async (): Promise<void> => {
    if (congressId === undefined || congressId === "") return;
    setLoading(true);
    try {
      const res = await fetch(`/api/congresses/${congressId}/enrollments/participants?size=100`);
      if (!res.ok) return;
      const raw: unknown = await res.json();
      const parsed = UserListSchema.safeParse(raw);
      if (parsed.success) {
        setAllEnrolled(parsed.data.items);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [congressId]);

  useEffect(() => {
    if (preloadEnrolled && congressId !== undefined && congressId !== "") {
      void loadAllEnrolled();
    }
  }, [preloadEnrolled, congressId, loadAllEnrolled]);

  const search = useCallback(async (term: string): Promise<void> => {
    if (term.trim().length < 2) {
      if (preloadEnrolled && allEnrolled.length > 0) {
        setResults(allEnrolled);
        setOpen(true);
      } else {
        setResults([]);
        setOpen(false);
      }
      return;
    }
    setLoading(true);
    try {
      const url =
        congressId !== undefined && congressId !== ""
          ? `/api/congresses/${congressId}/enrollments/participants?search=${encodeURIComponent(term.trim())}&size=20`
          : `/api/users?search=${encodeURIComponent(term.trim())}&size=10`;
      const res = await fetch(url);
      if (!res.ok) {
        setResults([]);
        return;
      }
      const raw: unknown = await res.json();
      const parsed = UserListSchema.safeParse(raw);
      if (parsed.success) {
        setResults(parsed.data.items);
        setOpen(true);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [congressId, preloadEnrolled, allEnrolled]);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void search(value);
    }, 300);
  }

  function handleSelect(user: UserData): void {
    onSelect(user);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function handleFocus(): void {
    if (preloadEnrolled && query.trim().length < 2 && allEnrolled.length > 0) {
      setResults(allEnrolled);
      setOpen(true);
    }
  }

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent): void {
      if (containerRef.current !== null && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, []);

  if (selected !== null) {
    return (
      <div
        className="flex h-11 items-center justify-between rounded-lg border border-[var(--color-primary)] bg-[var(--color-surface)] px-3"
        data-testid={testId}
      >
        <div className="flex flex-col gap-0">
          <span className="font-secondary text-sm font-medium text-[var(--color-text-primary-black)]">
            {selected.fullName}
          </span>
          <span className="font-secondary text-xs text-[var(--color-text-secondary)]">
            {selected.email} — ID: {selected.personalId}
          </span>
        </div>
        <button
          type="button"
          onClick={clearSelection}
          className="ml-2 rounded p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors duration-200"
          aria-label="Quitar seleccion"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full" data-testid={testId}>
      <div className="relative">
        <Search
          size={16}
          strokeWidth={1.5}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={handleQueryChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="h-11 pl-9"
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-secondary text-xs text-[var(--color-text-secondary)]">
            Buscando...
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-white)] py-1 shadow-[var(--shadow-high)] animate-fade-in-down"
        >
          {results.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  handleSelect(user);
                }}
                className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[var(--color-surface)]"
              >
                <span className="font-secondary text-sm font-medium text-[var(--color-text-primary-black)]">
                  {user.fullName}
                </span>
                <span className="font-secondary text-xs text-[var(--color-text-secondary)]">
                  {user.email} — ID: {user.personalId}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && results.length === 0 && !loading && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-white)] px-3 py-3 shadow-[var(--shadow-high)]">
          <p className="font-secondary text-sm text-[var(--color-text-secondary)]">
            No se encontraron participantes.
          </p>
        </div>
      )}
    </div>
  );
}
