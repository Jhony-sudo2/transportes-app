"use client";

import { useState, useCallback } from "react";
import { Users, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  CommitteeMemberListSchema,
  AddCommitteeMemberSchema,
  type CommitteeMemberData,
  type AddCommitteeMemberData,
} from "@/lib/validators/committee";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { type CongressData } from "@/lib/validators/congress";
import { type UserData } from "@/lib/validators/user";
import { CongressCombobox } from "@/components/domain/CongressCombobox";
import { UserSearchCombobox } from "@/components/domain/UserSearchCombobox";
import { formatDate } from "@/lib/utils/format";
import { useToast } from "@/hooks/useToast";

interface CommitteePageClientProps {
  congresses: CongressData[];
}

export function CommitteePageClient({
  congresses,
}: CommitteePageClientProps): React.ReactElement {
  const toast = useToast();

  const [selectedCongressId, setSelectedCongressId] = useState<string | null>(null);
  const [members, setMembers] = useState<CommitteeMemberData[]>([]);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<CommitteeMemberData | null>(null);
  const [mutating, setMutating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AddCommitteeMemberData>({
    resolver: zodResolver(AddCommitteeMemberSchema),
  });

  function resetAddDialog(): void {
    reset();
    setSelectedUser(null);
  }

  const fetchMembers = useCallback(
    async (congressId: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/congresses/${congressId}/committee`);
        if (!res.ok) {
          toast.error("Error al cargar los miembros del comite.");
          return;
        }
        const raw: unknown = await res.json();
        const parsed = CommitteeMemberListSchema.safeParse(raw);
        if (!parsed.success) {
          toast.error("Error al procesar los datos del comite.");
          return;
        }
        setMembers(parsed.data.items);
      } catch {
        toast.error("Error de conexion al cargar los miembros.");
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const handleCongressChange = async (congressId: string | null) => {
    setSelectedCongressId(congressId);
    setMembers([]);
    if (congressId !== null) {
      await fetchMembers(congressId);
    }
  };

  const onAddMember = async (data: AddCommitteeMemberData) => {
    if (selectedCongressId === null) return;
    setMutating(true);
    try {
      const res = await fetch(`/api/congresses/${selectedCongressId}/committee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body: unknown = await res.json();
        const parsed = ProblemDetailSchema.safeParse(body);
        toast.error(parsed.success ? parsed.data.detail : "Error al agregar el miembro.");
        return;
      }
      toast.success("Miembro agregado al comite.");
      resetAddDialog();
      setAddDialogOpen(false);
      await fetchMembers(selectedCongressId);
    } catch {
      toast.error("Error de conexion al agregar el miembro.");
    } finally {
      setMutating(false);
    }
  };

  const handleRemoveMember = async () => {
    if (selectedCongressId === null || memberToRemove === null) return;
    setMutating(true);
    try {
      const res = await fetch(
        `/api/congresses/${selectedCongressId}/committee/${memberToRemove.userId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        toast.error("Error al quitar el miembro del comite.");
        return;
      }
      toast.success("Miembro eliminado del comite.");
      setRemoveDialogOpen(false);
      setMemberToRemove(null);
      await fetchMembers(selectedCongressId);
    } catch {
      toast.error("Error de conexion al quitar el miembro.");
    } finally {
      setMutating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="congress-select-committee"
          className="font-sans text-sm font-medium text-[var(--color-text-primary)]"
        >
          Selecciona un congreso
        </label>
        <CongressCombobox
          id="congress-select-committee"
          congresses={congresses}
          value={selectedCongressId}
          onChange={(id) => { void handleCongressChange(id); }}
        />
      </div>

      {selectedCongressId !== null && (
        <div className="flex items-center justify-between">
          <p className="font-secondary text-sm text-[var(--color-text-secondary)]">
            {loading ? "Cargando miembros..." : `${members.length} miembro(s)`}
          </p>
          <Button
            onClick={() => { setAddDialogOpen(true); }}
            disabled={loading}
            className="min-h-[44px] bg-[var(--color-primary)] text-white hover:scale-[1.01] active:scale-[0.99]"
            data-testid="add-member-button"
          >
            <Plus size={16} strokeWidth={1.5} />
            Agregar miembro
          </Button>
        </div>
      )}

      {selectedCongressId !== null && !loading && (
        <>
          {members.length === 0 ? (
            <EmptyState
              icon={<Users size={24} strokeWidth={1.5} />}
              title="Sin miembros"
              description="Este congreso no tiene miembros de comite registrados."
              action={
                <Button
                  onClick={() => { setAddDialogOpen(true); }}
                  className="min-h-[44px] bg-[var(--color-primary)] text-white hover:scale-[1.01] active:scale-[0.99]"
                  data-testid="add-member-button"
                >
                  <Plus size={16} strokeWidth={1.5} />
                  Agregar miembro
                </Button>
              }
            />
          ) : (
            <div
              className="flex flex-col gap-3 animate-fade-in-up"
              data-testid="committee-list"
            >
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-white)] px-4 py-4"
                  data-testid="committee-member-row"
                >
                  <div className="flex flex-col gap-0.5">
                    <p className="font-sans text-sm font-medium text-[var(--color-text-primary-black)]">
                      {member.fullName}
                    </p>
                    <p className="font-secondary text-sm text-[var(--color-text-secondary)]">
                      {member.email}
                    </p>
                    <p className="font-secondary text-xs text-[var(--color-text-secondary)]">
                      Agregado: {formatDate(member.addedAt)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMemberToRemove(member);
                      setRemoveDialogOpen(true);
                    }}
                    className="min-h-[44px] border-[var(--color-error)] text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
                    data-testid="remove-member-button"
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                    Quitar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selectedCongressId === null && (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-12 text-center">
          <p className="font-secondary text-sm text-[var(--color-text-secondary)]">
            Selecciona un congreso para ver su comite.
          </p>
        </div>
      )}

      {/* Dialog: Agregar miembro */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) resetAddDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar miembro al comite</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(onAddMember)(e)} className="flex flex-col gap-4 mt-2">
            {/* Hidden field so react-hook-form tracks userId */}
            <input type="hidden" {...register("userId")} />

            <div className="flex flex-col gap-1.5">
              <Label>Buscar participante</Label>
              <UserSearchCombobox
                selected={selectedUser}
                onSelect={(user) => {
                  setSelectedUser(user);
                  void setValue("userId", user?.id ?? "", { shouldValidate: false });
                }}
                congressId={selectedCongressId ?? undefined}
                placeholder="Buscar participantes inscritos..."
                preloadEnrolled
                data-testid="committee-user-search"
              />
              {errors.userId !== undefined && (
                <p className="font-secondary text-xs text-[var(--color-error)]">
                  {errors.userId.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={resetAddDialog}
                >
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={mutating}
                className="min-h-[44px] bg-[var(--color-primary)] text-white"
              >
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmacion de eliminar */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quitar miembro del comite</DialogTitle>
          </DialogHeader>
          <p className="font-secondary text-sm text-[var(--color-text-primary)]">
            {memberToRemove !== null
              ? `Vas a quitar a ${memberToRemove.fullName} del comite. Esta accion no se puede deshacer.`
              : "Confirma la eliminacion del miembro."}
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px]"
                onClick={() => { setMemberToRemove(null); }}
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button
              onClick={() => void handleRemoveMember()}
              disabled={mutating}
              className="min-h-[44px] bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/90"
              data-testid="remove-member-confirm"
            >
              Quitar miembro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
