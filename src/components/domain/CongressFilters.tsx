"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { InstitutionData } from "@/lib/validators/institution";

interface CongressFiltersProps {
  institutions: InstitutionData[];
  currentSearch: string;
  currentInstitutionId: string;
}

const DEBOUNCE_MS = 300;

export function CongressFilters({
  institutions,
  currentSearch,
  currentInstitutionId,
}: CongressFiltersProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(currentSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushParams = useCallback(
    (search: string, institutionId: string): void => {
      const params = new URLSearchParams(searchParams.toString());
      if (search.trim() !== "") {
        params.set("search", search.trim());
      } else {
        params.delete("search");
      }
      if (institutionId !== "") {
        params.set("institutionId", institutionId);
      } else {
        params.delete("institutionId");
      }
      router.push(`/congresses?${params.toString()}`);
    },
    [router, searchParams],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const value = e.target.value;
    setSearchValue(value);

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      pushParams(value, currentInstitutionId);
    }, DEBOUNCE_MS);
  }

  function handleInstitutionChange(
    e: React.ChangeEvent<HTMLSelectElement>,
  ): void {
    const value = e.target.value;
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    pushParams(searchValue, value);
  }

  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
      data-testid="congress-filters"
    >
      {/* Search input */}
      <div className="relative flex-1">
        <Search
          size={16}
          strokeWidth={1.5}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchValue}
          onChange={handleSearchChange}
          placeholder="Buscar congresos..."
          aria-label="Buscar congresos"
          className="h-[44px] w-full rounded-full border border-[var(--color-border)] bg-[var(--color-white)] pl-9 pr-4 font-secondary text-sm text-[var(--color-text-primary-black)] placeholder:text-[var(--color-text-secondary)] transition-colors duration-200 hover:border-[var(--color-border-hover)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
          data-testid="congress-search-input"
        />
      </div>

      {/* Institution select */}
      <select
        value={currentInstitutionId}
        onChange={handleInstitutionChange}
        aria-label="Filtrar por institucion"
        className="h-[44px] rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-white)] px-3 font-secondary text-sm text-[var(--color-text-primary-black)] transition-colors duration-200 hover:border-[var(--color-border-hover)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] sm:w-56"
        data-testid="congress-institution-select"
      >
        <option value="">Todas las instituciones</option>
        {institutions.map((inst) => (
          <option key={inst.id} value={inst.id}>
            {inst.name}
          </option>
        ))}
      </select>
    </div>
  );
}
