import { Button } from "@/components/ui/button";
export function CustomerDataState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  if (loading)
    return (
      <p
        role="status"
        className="rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6 text-sm"
      >
        Cargando tus datos…
      </p>
    );
  if (!error) return null;
  return (
    <div className="space-y-4 rounded-2xl border border-red-300 bg-[var(--tg-paper)] p-6">
      <p role="alert" className="break-words text-sm">
        {error}
      </p>
      <Button type="button" variant="outline" onClick={retry}>
        Reintentar
      </Button>
    </div>
  );
}
