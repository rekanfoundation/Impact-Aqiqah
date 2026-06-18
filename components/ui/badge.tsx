import { cn } from "@/lib/utils";
import { toneClass } from "@/lib/status";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  DOC_STATUS,
  ANIMAL_STATUS,
  ISSUE_SEVERITY,
  ISSUE_STATUS,
  type OrderStatus,
  type PaymentStatus,
  type DocStatus,
  type AnimalStatus,
  type IssueSeverity,
  type IssueStatus,
} from "@/lib/status";

export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        toneClass(tone),
      )}
    >
      {label}
    </span>
  );
}

type Kind = "order" | "payment" | "doc" | "animal" | "issueSeverity" | "issueStatus";

const MAPS = {
  order: ORDER_STATUS,
  payment: PAYMENT_STATUS,
  doc: DOC_STATUS,
  animal: ANIMAL_STATUS,
  issueSeverity: ISSUE_SEVERITY,
  issueStatus: ISSUE_STATUS,
} as const;

export function StatusBadge({
  kind,
  value,
}: {
  kind: Kind;
  value:
    | OrderStatus
    | PaymentStatus
    | DocStatus
    | AnimalStatus
    | IssueSeverity
    | IssueStatus;
}) {
  const map = MAPS[kind] as Record<string, { label: string; tone: never }>;
  const meta = map[value] ?? { label: value, tone: "neutral" };
  return <Badge label={meta.label} tone={meta.tone} />;
}
