"use client";

import { useState, useCallback } from "react";
import { Users, Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { UserSearchCombobox } from "@/components/domain/UserSearchCombobox";
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
import { type UserData } from "@/lib/validators/user";
import { formatDate } from "@/lib/utils/format";
import { useToast } from "@/hooks/useToast";

interface CommitteeScopedPageClientProps {
  congressId: string;
  congressName: string;
  initialMembers: CommitteeMemberData[];
}

export function CommitteeScopedPageClient({
  congressId,
  congressName,
  initialMembers,
}: CommitteeScopedPageClientProps): React.ReactElement {
  const toast = useToast();
  const [members, setMembers] = useState<CommitteeMemberData[]>(initialMembers);
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

  const refreshMembers = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/congresses/${congressId}/committee`);
      if (!res.ok) return;
      const raw: unknown = await res.json();
      const parsed = CommitteeMemberListSchema.safeParse(raw);
      if (parsed.success) {
        setMembers(parsed.data.items);
      }
    } catch {
      /* silent */
    }
  }, [congressId]);

  const onAddMember = async (data: AddCommitteeMemberData): Promise<void> => {
    setMutating(true);
    try {
      const res = await fetch(`/api/congresses/${congressId}/committee`, {
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
      reset();
      setSelectedUser(null);
      setAddDialogOpen(false);
      await refreshMembers();
    } catch {
      toast.error("Error de conexion al agregar el miembro.");
    } finally {
      setMutating(false);
    }
  };

  const handleRemoveMember = async (): Promise<void> => {
    if (memberToRemove === null) return;
    setMutating(true);
    try {
      const res = await fetch(`/api/congresses/${congressId}/committee/${memberToRemove.userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Error al quitar el miembro del comite.");
        return;
      }
      toast.success("Miembro eliminado del comite.");
      setRemoveDialogOpen(false);
      setMemberToRemove(null);
      await refreshMembers();
    } catch {
      toast.error("Error de conexion al quitar el miembro.");
    } finally {
      setMutating(false);
    }
  };

  return (
    <div data-testid="congress-committee-scoped-page" className="flex flex-col gap-6">
      <div>
        <Link
          href="/congress-admin/congresses"
          className="inline-flex items-center gap-1.5 font-secondary text-sm text-[var(--color-primary-text)] transition-opacity duration-200 hover:opacity-70"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a mis congresos
        </Link>
      </div>

      <PageHeader
        title="Comite cientifico"
        description={`Gestiona los miembros del comite del congreso: ${congressName}`}
        action={
          <Button
            onClick={() => {
              setAddDialogOpen(true);
            }}
            className="min-h-[44px] bg-[var(--color-primary)] text-white hover:scale-[1.01] active:scale-[0.99]"
            data-testid="add-member-button"
          >
            <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
            Agregar miembro
          </Button>
        }
      />

      {members.length === 0 ? (
        <EmptyState
          icon={<Users size={24} strokeWidth={1.5} />}
          title="Sin miembros"
          description="Este congreso no tiene miembros de comite registrados."
          action={
            <Button
              onClick={() => {
                setAddDialogOpen(true);
              }}
              className="min-h-[44px] bg-[var(--color-primary)] text-white hover:scale-[1.01] active:scale-[0.99]"
              data-testid="add-member-button"
            >
              <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
              Agregar miembro
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3 animate-fade-in-up" data-testid="committee-list">
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
                <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
                Quitar
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Dialog: Agregar miembro */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) {
            reset();
            setSelectedUser(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar miembro al comite</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => void handleSubmit(onAddMember)(e)}
            className="flex flex-col gap-4 mt-2"
          >
            <div className="flex flex-col gap-1.5">
              <Label>Buscar participante</Label>
              <UserSearchCombobox
                selected={selectedUser}
                onSelect={(user) => {
                  setSelectedUser(user);
                  if (user !== null) {
                    setValue("userId", user.id);
                  } else {
                    setValue("userId", "");
                  }
                }}
                congressId={congressId}
                placeholder="Buscar participantes inscritos..."
                data-testid="committee-user-search"
              />
              {errors.userId !== undefined && (
                <p className="font-secondary text-xs text-[var(--color-error)]">
                  {errors.userId.message ?? "Selecciona un participante"}
                </p>
              )}
              {/* Hidden input keeps react-hook-form registered */}
              <input type="hidden" {...register("userId")} />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={() => {
                    reset();
                    setSelectedUser(null);
                  }}
                >
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={mutating || selectedUser === null}
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
                onClick={() => {
                  setMemberToRemove(null);
                }}
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
