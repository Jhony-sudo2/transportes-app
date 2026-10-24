"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, MapPin, Pencil, Plus, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BranchMap } from "./BranchMap";
import {
  BranchListSchema,
  BranchSchema,
  CoordinateSchema,
  CreateBranchSchema,
  LocationListSchema,
  getBranchCoordinate,
  roundCoordinate,
  type Branch,
  type Coordinate,
  type CreateBranch,
  type Location,
} from "@/lib/validators/branch";
async function responseData(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  if (!response.ok)
    throw new Error(
      body && typeof body === "object" && "detail" in body
        ? String(body.detail)
        : "No se pudo completar la solicitud.",
    );
  return body;
}
const selectClass =
  "h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3 text-sm disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[var(--tg-green)]";
export function BranchesPageClient() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [editError, setEditError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [focus, setFocus] = useState<Coordinate | null>(null);
  const [departments, setDepartments] = useState<Location[]>([]);
  const [municipalities, setMunicipalities] = useState<Location[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [departmentLoading, setDepartmentLoading] = useState(false);
  const [municipalityLoading, setMunicipalityLoading] = useState(false);
  const [departmentError, setDepartmentError] = useState("");
  const [municipalityError, setMunicipalityError] = useState("");
  const [catalogRetry, setCatalogRetry] = useState(0);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateBranch>({
    resolver: zodResolver(CreateBranchSchema),
    defaultValues: { name: "", phone: "", direction: { indication: "" } },
  });
  const latitude = watch("direction.latitude");
  const longitude = watch("direction.longitude");
  const municipalityId = watch("direction.municipalityId");
  const point = useMemo(() => {
    const parsed = CoordinateSchema.safeParse({ latitude, longitude });
    return parsed.success ? parsed.data : null;
  }, [latitude, longitude]);
  const loadBranches = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setListError("");
    try {
      const result = BranchListSchema.parse(
        await responseData(await fetch("/api/admin/branches", signal ? { signal } : {})),
      );
      if (!signal?.aborted) setBranches(result);
    } catch (cause) {
      if (!signal?.aborted)
        setListError(
          cause instanceof Error ? cause.message : "No se pudieron consultar las sucursales.",
        );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void loadBranches(controller.signal);
    return () => controller.abort();
  }, [loadBranches]);
  useEffect(() => {
    if (!formOpen) return;
    const controller = new AbortController();
    setDepartmentLoading(true);
    setDepartmentError("");
    void (async () => {
      try {
        const data = LocationListSchema.parse(
          await responseData(await fetch("/api/admin/locations", { signal: controller.signal })),
        );
        if (!controller.signal.aborted) {
          setDepartments(data);
          if (!data.length) setDepartmentError("No hay departamentos disponibles.");
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setDepartmentError(
            cause instanceof Error ? cause.message : "No se pudo consultar el catálogo.",
          );
      } finally {
        if (!controller.signal.aborted) setDepartmentLoading(false);
      }
    })();
    return () => controller.abort();
  }, [formOpen, catalogRetry]);
  useEffect(() => {
    setMunicipalities([]);
    setMunicipalityError("");
    if (!formOpen || !departmentId) {
      setMunicipalityLoading(false);
      return;
    }
    const controller = new AbortController();
    setMunicipalityLoading(true);
    void (async () => {
      try {
        const data = LocationListSchema.parse(
          await responseData(
            await fetch(`/api/admin/locations?departmentId=${departmentId}`, {
              signal: controller.signal,
            }),
          ),
        );
        if (!controller.signal.aborted) {
          setMunicipalities(data);
          if (!data.length) setMunicipalityError("No hay municipios en este departamento.");
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setMunicipalityError(
            cause instanceof Error ? cause.message : "No se pudieron consultar los municipios.",
          );
      } finally {
        if (!controller.signal.aborted) setMunicipalityLoading(false);
      }
    })();
    return () => controller.abort();
  }, [formOpen, departmentId, catalogRetry]);
  const changePoint = useCallback(
    (value: Coordinate) => {
      const rounded = roundCoordinate(value);
      setFocus(null);
      setValue("direction.latitude", rounded.latitude, { shouldDirty: true, shouldValidate: true });
      setValue("direction.longitude", rounded.longitude, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [setValue],
  );
  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    reset({
      name: "",
      phone: "",
      direction: {
        indication: "",
        municipalityId: Number.NaN,
        latitude: Number.NaN,
        longitude: Number.NaN,
      },
    });
    setDepartmentId("");
    setError("");
  }
  async function openEdit(id: number) {
    setBusy(true);
    setEditError("");
    setSuccess("");
    try {
      const branch = BranchSchema.parse(
        await responseData(await fetch(`/api/admin/branches/${id}`)),
      );
      setEditing(branch);
      reset({
        name: branch.name,
        phone: branch.phone ?? "",
        direction: {
          municipalityId: branch.municipalityId ?? Number.NaN,
          latitude: branch.latitude ?? Number.NaN,
          longitude: branch.longitude ?? Number.NaN,
          indication: branch.indication ?? "",
        },
      });
      setDepartmentId(branch.departamentId?.toString() ?? "");
      setFocus(getBranchCoordinate(branch));
      setError("");
      setFormOpen(true);
    } catch (cause) {
      setEditError(
        cause instanceof Error ? cause.message : "No se pudo cargar la sucursal para editarla.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit(data: CreateBranch) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = BranchSchema.parse(
        await responseData(
          await fetch(editing ? `/api/admin/branches/${editing.id}` : "/api/admin/branches", {
            method: editing ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          }),
        ),
      );
      setBranches((previous) =>
        previous.some((branch) => branch.id === result.id)
          ? previous.map((branch) => (branch.id === result.id ? result : branch))
          : [...previous, result],
      );
      setListError("");
      setFocus(getBranchCoordinate(result));
      setSuccess(
        `Sucursal «${result.name}» ${editing ? "actualizada" : "guardada"} correctamente.`,
      );
      closeForm();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo confirmar el guardado. Actualiza el listado antes de volver a guardar.",
      );
    } finally {
      setBusy(false);
    }
  }
  const withoutLocation = branches.filter((branch) => !getBranchCoordinate(branch)).length;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--tg-muted)]">
          {loading
            ? "Consultando sucursales…"
            : listError
              ? "Listado no disponible"
              : `${branches.length} sucursal${branches.length === 1 ? "" : "es"} registrada${branches.length === 1 ? "" : "s"}`}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" disabled={loading || busy} onClick={() => void loadBranches()}>
            <RotateCw size={15} aria-hidden="true" />
            Actualizar
          </Button>
          {!formOpen && (
            <Button
              disabled={loading || busy}
              onClick={() => {
                closeForm();
                setEditError("");
                setFormOpen(true);
                setSuccess("");
                setFocus(null);
              }}
            >
              <Plus size={16} aria-hidden="true" />
              Nueva sucursal
            </Button>
          )}
        </div>
      </div>
      {success && (
        <p
          role="status"
          className="rounded-xl border border-[var(--tg-line)] bg-[var(--color-surface)] p-4 text-sm"
        >
          {success}
        </p>
      )}
      {editError && (
        <p role="alert" className="rounded-lg border border-red-300 p-4 text-sm">
          {editError}
        </p>
      )}
      {listError && (
        <p role="alert" className="rounded-lg border border-red-300 p-4 text-sm">
          {listError}
        </p>
      )}
      <div className={formOpen ? "grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]" : ""}>
        {formOpen && (
          <section className="rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">
                {editing ? "Editar sucursal" : "Crear sucursal"}
              </h2>
              <button
                type="button"
                aria-label={
                  editing ? "Cancelar edición de sucursal" : "Cancelar creación de sucursal"
                }
                disabled={busy}
                onClick={closeForm}
                className="cursor-pointer rounded p-2"
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(event) => {
                void handleSubmit(submit)(event);
              }}
              noValidate
            >
              {editing && (!editing.departamentId || !editing.municipalityId) && (
                <p className="mb-4 text-sm text-[var(--tg-muted)]">
                  Selecciona el departamento y municipio para confirmar la ubicación de esta
                  sucursal.
                </p>
              )}
              <fieldset disabled={busy} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="branch-name">Nombre de la sucursal</Label>
                  <Input
                    id="branch-name"
                    maxLength={255}
                    required
                    aria-invalid={!!errors.name}
                    {...register("name")}
                  />
                  {errors.name && (
                    <p role="alert" className="text-xs text-red-600">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch-phone">Teléfono</Label>
                  <Input
                    id="branch-phone"
                    type="tel"
                    autoComplete="tel"
                    maxLength={20}
                    required
                    aria-invalid={!!errors.phone}
                    {...register("phone")}
                  />
                  {errors.phone && (
                    <p role="alert" className="text-xs text-red-600">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch-department">Departamento</Label>
                  <select
                    id="branch-department"
                    className={selectClass}
                    value={departmentId}
                    disabled={busy || departmentLoading || !!departmentError}
                    onChange={(event) => {
                      setDepartmentId(event.target.value);
                      setValue("direction.municipalityId", Number.NaN);
                    }}
                  >
                    <option value="">
                      {departmentLoading ? "Cargando departamentos…" : "Selecciona un departamento"}
                    </option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch-municipality">Municipio</Label>
                  <select
                    id="branch-municipality"
                    className={selectClass}
                    disabled={busy || !departmentId || municipalityLoading || !!municipalityError}
                    required
                    aria-invalid={!!errors.direction?.municipalityId}
                    value={Number.isFinite(municipalityId) ? municipalityId : ""}
                    {...register("direction.municipalityId", { valueAsNumber: true })}
                  >
                    <option value="">
                      {municipalityLoading ? "Cargando municipios…" : "Selecciona un municipio"}
                    </option>
                    {municipalities.map((municipality) => (
                      <option key={municipality.id} value={municipality.id}>
                        {municipality.name}
                      </option>
                    ))}
                  </select>
                  {errors.direction?.municipalityId && (
                    <p role="alert" className="text-xs text-red-600">
                      {errors.direction.municipalityId.message}
                    </p>
                  )}
                </div>
                {(departmentError || municipalityError) && (
                  <div role="alert" className="space-y-2 text-sm">
                    <p>{departmentError || municipalityError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCatalogRetry((value) => value + 1)}
                    >
                      Reintentar ubicaciones
                    </Button>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="branch-indication">Dirección e indicaciones</Label>
                  <Input
                    id="branch-indication"
                    maxLength={255}
                    autoComplete="street-address"
                    {...register("direction.indication")}
                  />
                  {errors.direction?.indication && (
                    <p role="alert" className="text-xs text-red-600">
                      {errors.direction.indication.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="branch-latitude">Latitud</Label>
                    <Input
                      id="branch-latitude"
                      type="number"
                      step="any"
                      min={-90}
                      max={90}
                      required
                      aria-invalid={!!errors.direction?.latitude}
                      {...register("direction.latitude", {
                        valueAsNumber: true,
                        onChange: () => setFocus(null),
                      })}
                    />
                    {errors.direction?.latitude && (
                      <p role="alert" className="text-xs text-red-600">
                        {errors.direction.latitude.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch-longitude">Longitud</Label>
                    <Input
                      id="branch-longitude"
                      type="number"
                      step="any"
                      min={-180}
                      max={180}
                      required
                      aria-invalid={!!errors.direction?.longitude}
                      {...register("direction.longitude", {
                        valueAsNumber: true,
                        onChange: () => setFocus(null),
                      })}
                    />
                    {errors.direction?.longitude && (
                      <p role="alert" className="text-xs text-red-600">
                        {errors.direction.longitude.message}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs leading-5 text-[var(--tg-muted)]">
                  Haz clic en el mapa o escribe las coordenadas. Arrastra el marcador naranja para
                  ajustar la ubicación.
                </p>
              </fieldset>
              {error && (
                <p role="alert" className="mt-4 rounded-lg border border-red-300 p-3 text-sm">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={
                  busy ||
                  departmentLoading ||
                  municipalityLoading ||
                  !!departmentError ||
                  !!municipalityError
                }
                className="mt-6 w-full"
              >
                {busy ? "Guardando…" : editing ? "Guardar cambios" : "Guardar sucursal"}
              </Button>
            </form>
          </section>
        )}
        <section
          id="branch-map-anchor"
          className="min-w-0 rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-4 sm:p-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <MapPin size={19} className="text-[var(--tg-green)]" aria-hidden="true" />
              {formOpen ? "Selecciona la ubicación" : "Mapa de sucursales"}
            </h2>
            <p className="text-xs text-[var(--tg-muted)]">
              Verde: sucursal guardada{formOpen ? " · Naranja: por guardar" : ""}
            </p>
          </div>
          <BranchMap
            branches={branches}
            point={formOpen ? point : null}
            focus={focus}
            onPointChange={formOpen && !busy ? changePoint : undefined}
          />
          {withoutLocation > 0 && (
            <p className="mt-3 text-xs text-[var(--tg-muted)]">
              {withoutLocation} sucursal(es) sin coordenadas válidas no se muestran en el mapa.
            </p>
          )}
        </section>
      </div>
      <section>
        <h2 className="mb-4 text-xl font-semibold">Sucursales registradas</h2>
        {loading ? (
          <p role="status" className="text-sm">
            Cargando sucursales…
          </p>
        ) : branches.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {branches.map((branch) => {
              const coordinate = getBranchCoordinate(branch);
              return (
                <article
                  key={branch.id}
                  className="rounded-xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-5"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <Building2 size={19} className="text-[var(--tg-green)]" aria-hidden="true" />
                    <h3 className="font-semibold">{branch.name}</h3>
                  </div>
                  <p className="text-sm text-[var(--tg-muted)]">
                    {[branch.municipalityName, branch.departamentName].filter(Boolean).join(", ") ||
                      "Ubicación administrativa no disponible"}
                  </p>
                  {branch.phone && <p className="mt-2 text-sm">{branch.phone}</p>}
                  {branch.indication && (
                    <p className="mt-2 text-sm text-[var(--tg-muted)]">{branch.indication}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Editar sucursal: ${branch.name}`}
                      disabled={busy || loading || formOpen}
                      onClick={() => void openEdit(branch.id)}
                    >
                      <Pencil size={14} aria-hidden="true" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!coordinate}
                      onClick={() => {
                        setFocus(coordinate);
                        document
                          .getElementById("branch-map-anchor")
                          ?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                    >
                      Ver en mapa<span className="sr-only">: {branch.name}</span>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          !listError && (
            <p className="rounded-xl border border-dashed border-[var(--tg-line)] p-8 text-center text-sm text-[var(--tg-muted)]">
              Aún no hay sucursales. Registra la primera para ubicarla en el mapa.
            </p>
          )
        )}
      </section>
    </div>
  );
}
