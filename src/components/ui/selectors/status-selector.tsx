import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";

export function StatusSelector({
  filter,
  setFilter,
  disabled = false,
  className,
}: {
  filter: "all" | "pending" | "rejected" | "payed" | "submitted" | "approved";
  setFilter: (
    filter: "all" | "pending" | "rejected" | "payed" | "submitted" | "approved",
  ) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select
      value={filter}
      onValueChange={(
        value:
          | "all"
          | "pending"
          | "rejected"
          | "payed"
          | "submitted"
          | "approved",
      ) => setFilter(value)}
      disabled={disabled}
    >
      <SelectTrigger
        className={
          className ??
          "w-[180px] focus:outline-none focus:ring-0 focus:ring-yellow-500 focus:border-yellow-500"
        }
      >
        <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <SelectValue placeholder="Todos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os Estados</SelectItem>
        <SelectItem value="submitted">Guardada</SelectItem>
        <SelectItem value="pending">Pendente</SelectItem>
        <SelectItem value="approved">Aprovada</SelectItem>
        <SelectItem value="payed">Paga</SelectItem>
        <SelectItem value="rejected">Rejeitada</SelectItem>
      </SelectContent>
    </Select>
  );
}
