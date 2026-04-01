import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PageSizeSelector({
  pageSize,
  setPageSize,
  disabled = false,
}: {
  pageSize: number;
  setPageSize: (size: number) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={pageSize.toString()}
      onValueChange={(value) => setPageSize(Number(value))}
      disabled={disabled}
    >
      <SelectTrigger className="w-[80px]">
        <SelectValue placeholder="Page Size" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">1</SelectItem>
        <SelectItem value="2">2</SelectItem>
        <SelectItem value="5">5</SelectItem>
        <SelectItem value="10">10</SelectItem>
        <SelectItem value="20">20</SelectItem>
        <SelectItem value="50">50</SelectItem>
      </SelectContent>
    </Select>
  );
}
