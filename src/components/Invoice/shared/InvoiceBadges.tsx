import React from "react";
import {
  Check,
  Clock,
  X,
  DollarSign,
  User as UserIcon,
  Building,
} from "lucide-react";
import { Invoice } from "../../../types";

interface StatusBadgeProps {
  status: Invoice["status"];
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  // Ensure status is lowercase for consistent mapping
  let normalizedStatus = status.toLowerCase() as
    | "pending"
    | "payed"
    | "rejected"
    | "submitted";

  // Fix for SUBMITTED status showing as Pendente
  if (status === "SUBMITTED") {
    normalizedStatus = "submitted";
  }

  const styles = {
    pending: "bg-yellow-100 text-yellow-800",
    payed: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    submitted: "bg-blue-100 text-blue-800",
  };

  const icons = {
    pending: <Clock className="w-3 h-3 mr-1" />,
    payed: <Check className="w-3 h-3 mr-1" />,
    rejected: <X className="w-3 h-3 mr-1" />,
    submitted: <Clock className="w-3 h-3 mr-1" />,
  };

  const labels = {
    pending: "Pendente",
    payed: "Paga",
    rejected: "Rejeitada",
    submitted: "Guardada",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[normalizedStatus]}`}
    >
      {icons[normalizedStatus]}
      {labels[normalizedStatus]}
    </span>
  );
};

interface TypeBadgeProps {
  type: Invoice["type"];
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  // Ensure type is lowercase for consistent comparison
  const normalizedType = type.toLowerCase();

  let bgColorClass = "bg-purple-100 text-purple-800"; // Default for benefits
  let label = "Benefícios"; // Default label

  if (normalizedType === "company") {
    bgColorClass = "bg-blue-100 text-blue-800";
    label = "Empresa";
  } else if (normalizedType === "bonus") {
    bgColorClass = "bg-green-100 text-green-800";
    label = "Bónus";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bgColorClass}`}
    >
      {label}
    </span>
  );
};

interface PayerBadgeProps {
  payer?: Invoice["payer"];
}

export const PayerBadge: React.FC<PayerBadgeProps> = ({ payer }) => {
  if (!payer) return null;

  const styles = {
    COMPANY: "bg-blue-100 text-blue-800",
    EMPLOYEE: "bg-green-100 text-green-800",
    SUPPLIER: "bg-purple-100 text-purple-800",
  };

  const icons = {
    COMPANY: <Building className="w-3 h-3 mr-1" />,
    EMPLOYEE: <UserIcon className="w-3 h-3 mr-1" />,
    SUPPLIER: <DollarSign className="w-3 h-3 mr-1" />,
  };

  const labels = {
    COMPANY: "Pago pela Empresa",
    EMPLOYEE: "Pago pelo Colaborador",
    SUPPLIER: "Pago ao Fornecedor",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[payer]}`}
    >
      {icons[payer]}
      {labels[payer]}
    </span>
  );
};
