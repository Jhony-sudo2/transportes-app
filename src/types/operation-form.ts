export interface FormChoice {
  value: string;
  label: string;
}
export interface PendingCommand {
  key: string;
  path: string;
  method: "POST" | "PATCH" | "PUT";
  body: unknown;
}
export interface OperationField {
  name: string;
  label: string;
  type?:
    | "text"
    | "number"
    | "date"
    | "datetime-local"
    | "email"
    | "textarea"
    | "select"
    | "checkbox";
  value?: string | number | boolean | undefined;
  optional?: boolean;
  numeric?: boolean;
  choices?: FormChoice[] | undefined;
  min?: number | undefined;
  step?: string | undefined;
}
