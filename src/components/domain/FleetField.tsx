import type { InputHTMLAttributes } from "react";
import type { FieldError } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: FieldError | undefined;
};
export function FleetField({ label, error, ...props }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>{label}</Label>
      <Input
        {...props}
        aria-invalid={!!error}
        aria-describedby={error ? props.id + "-error" : undefined}
      />
      {error && (
        <p id={props.id + "-error"} role="alert" className="text-xs text-red-600">
          {error.message}
        </p>
      )}
    </div>
  );
}
