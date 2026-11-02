"use client";
import { useState } from "react";
import { useCustomerData } from "@/hooks/useCustomerData";
import { CancellationPolicySchema } from "@/lib/validators/commerce";
import { OperationForm } from "./OperationForm";
import { CustomerDataState } from "./CustomerDataState";
export function CancellationPolicy({ userId }: { userId: number }) {
  const data = useCustomerData("/api/commerce/policy", CancellationPolicySchema),
    [notice, setNotice] = useState("");
  return (
    <div className="space-y-5">
      <CustomerDataState loading={data.loading} error={data.error} retry={data.refresh} />
      {notice && <p role="status">{notice}</p>}
      {data.data && (
        <OperationForm
          key={`${data.data.cutoffMinutes}:${data.data.voluntaryRefundPercent}`}
          scope={`policy:${userId}`}
          path="/api/commerce/policy"
          method="PUT"
          schema={CancellationPolicySchema}
          resultSchema={CancellationPolicySchema}
          fields={[
            {
              name: "cutoffMinutes",
              label: "Corte de cancelación de boletos (minutos)",
              type: "number",
              value: data.data.cutoffMinutes,
              min: 0,
              step: "1",
            },
            {
              name: "voluntaryRefundPercent",
              label: "Porcentaje de devolución voluntaria",
              type: "number",
              value: data.data.voluntaryRefundPercent,
              min: 0.01,
              step: "0.01",
            },
          ]}
          label="Guardar política global"
          onSaved={() => {
            setNotice("Política actualizada. Los reembolsos anteriores conservan su porcentaje.");
            data.refresh();
          }}
        />
      )}
    </div>
  );
}
