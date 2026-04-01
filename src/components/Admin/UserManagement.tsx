import React, { useEffect, useState } from "react";
import { Invoice, User, UserLimitsUpdate } from "../../types";
import { userService } from "../../services/userService";
import { invoiceService } from "../../services/invoiceService";
import { ChevronDown, ChevronUp, Edit, Save, X, Info } from "lucide-react";
import { Separator } from "@radix-ui/react-separator";
import styles from "./UserManagement.module.css";

interface UserManagementProps {
  currentUser: User;
}

interface LabelValuePairProps {
  label: string;
  value: string | number;
}

const LabelValuePair: React.FC<LabelValuePairProps> = ({ label, value }) => (
  <div className="grid grid-cols-[2.5rem,minmax(0,6.5rem)] items-center gap-x-1.5">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <span className="text-sm text-gray-700 tabular-nums text-right">
      {value}
    </span>
  </div>
);

interface LimitsSectionProps {
  title: string;
  limits: {
    annual_limit: number;
    used: number;
    pending: number;
    accrued_limit: number;
    available: number;
  };
  barColor: string;
}

const LimitsSection: React.FC<LimitsSectionProps> = ({
  title,
  limits,
  barColor,
}) => {
  const percentage = (limits.used / (limits.accrued_limit || 1)) * 100;

  return (
    <div
      className="
      rounded-xl
      bg-white
      p-4
      shadow-sm
      border
      border-gray-100
      flex
      flex-col
      gap-4
      min-w-0
    "
    >
      <p className="text-sm font-semibold text-gray-600">{title}</p>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 min-w-0">
        <LabelValuePair
          label="Anual:"
          value={`${limits.annual_limit.toFixed(2)}€`}
        />
        <LabelValuePair
          label="Mensal:"
          value={`${(limits.annual_limit / 12).toFixed(2)}€`}
        />
        <Separator className="col-span-2 border border-gray-100 mb-2" />
        <LabelValuePair
          label="Utilizado:"
          value={`${limits.used.toFixed(2)}€`}
        />
        <LabelValuePair
          label="Disponível:"
          value={`${limits.available.toFixed(2)}€`}
        />
      </div>

      <div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`${barColor} h-2.5 rounded-full transition-all`}
            style={{
              width: `${Math.min(100, percentage)}%`,
            }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-2">
          <p>
            Utilização:{" "}
            <span className="font-medium">{percentage.toFixed(1)}%</span> do
            limite acumulado
          </p>
        </div>
      </div>
    </div>
  );
};

interface UserLimitsTableCellProps {
  limits: {
    annual_limit: number;
    used: number;
    pending: number;
    accrued_limit: number;
    available: number;
  };
  isEditing: boolean;
  accountType: "companyAccount" | "employeeBenefits" | "bonusAccount";
  editedLimits: UserLimitsUpdate | null;
  onLimitChange: (
    type: "companyAccount" | "employeeBenefits" | "bonusAccount",
    value: string,
  ) => void;
}

const UserLimitsTableCell: React.FC<UserLimitsTableCellProps> = ({
  limits,
  isEditing,
  accountType,
  editedLimits,
  onLimitChange,
}) => {
  if (isEditing) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center mb-1">
          <label className="text-xs text-gray-500 mr-2">Limite Anual:</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={
              accountType === "bonusAccount"
                ? editedLimits?.bonusAccount?.annual_limit || 0
                : editedLimits?.[accountType]?.annual_limit || 0
            }
            onChange={(e) => onLimitChange(accountType, e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 w-24"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="ml-1 text-xs text-gray-500">€</div>
        </div>
        <div className="text-xs text-gray-500 flex items-center">
          <Info className="h-3 w-3 mr-1" />
          Limite acumulado calculado automaticamente
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <LabelValuePair
        label="Anual:"
        value={`${limits.annual_limit.toFixed(2)}€`}
      />
      <LabelValuePair
        label="Mensal:"
        value={`${(limits.annual_limit / 12).toFixed(2)}€`}
      />
    </div>
  );
};

export const UserManagement: React.FC<UserManagementProps> = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editedLimits, setEditedLimits] = useState<UserLimitsUpdate | null>(
    null,
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  // State for user dashboard
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userInvoices, setUserInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const fetchedUsers = await userService.getUsers();
      // Filter out users with role ADMIN
      const filteredUsers = fetchedUsers.filter(
        (user) => user.role !== "ADMIN",
      );
      setUsers(filteredUsers);
      setError(null);
    } catch (err) {
      setError("Failed to fetch users. Please try again.");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserDashboard = async (userId: string) => {
    // If clicking on the already expanded user, collapse it
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setUserInvoices([]);
      return;
    }

    // Otherwise, expand the clicked user
    setExpandedUserId(userId);
    setLoadingInvoices(true);
    setInvoiceError(null);

    try {
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const formatDate = (date: Date) => date.toISOString().split("T")[0];

      // Fetch current year invoices and filter for the selected user
      const allInvoices = await invoiceService.getInvoices({
        dateStart: formatDate(yearStart),
      });
      const userInvoices = allInvoices.filter(
        (invoice) => invoice.userId === userId,
      );
      setUserInvoices(userInvoices);
    } catch (err) {
      setInvoiceError("Failed to fetch user invoices. Please try again.");
      console.error("Error fetching user invoices:", err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleEditLimits = (user: User) => {
    setEditingUserId(user.id);
    setValidationError(null);

    // Set the annual limits directly from the user's limits
    setEditedLimits({
      companyAccount: {
        annual_limit: user.limits.companyAccount.annual_limit,
      },
      employeeBenefits: {
        annual_limit: user.limits.employeeBenefits.annual_limit,
      },
      bonusAccount: {
        annual_limit:
          user.can_use_bonus && user.limits.bonusAccount
            ? user.limits.bonusAccount.annual_limit
            : 0,
      },
    });
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditedLimits(null);
  };

  const handleSaveLimits = async (userId: string) => {
    if (!editedLimits) return;

    // Validate the limits before saving
    if (validationError) {
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await userService.updateUserLimits(
        userId,
        editedLimits,
      );

      // Update the user in the local state
      setUsers(users.map((user) => (user.id === userId ? updatedUser : user)));

      setEditingUserId(null);
      setEditedLimits(null);
      setError(null);
      setValidationError(null);
    } catch (err) {
      setError("Failed to update user limits. Please try again.");
      console.error("Error updating user limits:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLimitChange = (
    type: "companyAccount" | "employeeBenefits" | "bonusAccount",
    value: string,
  ) => {
    if (!editedLimits) return;

    const numValue = parseFloat(value) || 0;

    // Validate that the annual limit is not negative
    if (numValue < 0) {
      setValidationError("O limite anual não pode ser negativo.");
      return;
    }

    // Accrued limit is calculated on the backend
    setValidationError(null);

    // Special handling for bonusAccount
    if (type === "bonusAccount") {
      // If value is 0, set bonusAccount to undefined (will disable bonus for user)
      // Otherwise, set the annual limit
      setEditedLimits({
        ...editedLimits,
        [type]:
          numValue === 0
            ? undefined
            : {
                annual_limit: numValue,
              },
      });
    } else {
      // For companyAccount and employeeBenefits, just update the annual limit
      setEditedLimits({
        ...editedLimits,
        [type]: {
          annual_limit: numValue,
        },
      });
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  return (
    <div className={`container mx-auto px-4 py-8 ${styles.userManagement}`}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Gestão de Limites Anuais
        </h1>
        <p className="text-gray-600">
          Defina os limites anuais de despesas para cada colaborador.
        </p>
      </div>

      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {validationError && (
        <div
          className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <span className="block sm:inline">{validationError}</span>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="w-full table-fixed divide-y divide-gray-200">
          <colgroup>
            <col className="w-[40%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[6%]" />
          </colgroup>
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Colaborador
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Limites Conta Empresa
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Limites Benefícios
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Limites Bónus
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <React.Fragment key={user.id}>
                <tr
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleUserDashboard(user.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="mr-2">
                        {expandedUserId === user.id ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <UserLimitsTableCell
                      limits={user.limits.companyAccount}
                      isEditing={editingUserId === user.id}
                      accountType="companyAccount"
                      editedLimits={editedLimits}
                      onLimitChange={handleLimitChange}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <UserLimitsTableCell
                      limits={user.limits.employeeBenefits}
                      isEditing={editingUserId === user.id}
                      accountType="employeeBenefits"
                      editedLimits={editedLimits}
                      onLimitChange={handleLimitChange}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.can_use_bonus && user.limits.bonusAccount ? (
                      <UserLimitsTableCell
                        limits={user.limits.bonusAccount}
                        isEditing={editingUserId === user.id}
                        accountType="bonusAccount"
                        editedLimits={editedLimits}
                        onLimitChange={handleLimitChange}
                      />
                    ) : (
                      <div className="text-sm text-gray-500 italic">
                        Não disponível
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex justify-center">
                      {editingUserId === user.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveLimits(user.id);
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Save className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditLimits(user);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Expanded dashboard section */}
                {expandedUserId === user.id && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-0 py-0 border-b border-gray-200"
                    >
                      <div
                        className={`bg-gray-50 px-6 py-4 ${styles.animateSlideDown}`}
                      >
                        {/* User Info */}
                        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
                          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                            <LimitsSection
                              title="Conta Empresa"
                              limits={user.limits.companyAccount}
                              barColor="bg-blue-600"
                            />
                            <LimitsSection
                              title="Benefícios"
                              limits={user.limits.employeeBenefits}
                              barColor="bg-green-600"
                            />

                            {user.can_use_bonus && user.limits.bonusAccount && (
                              <LimitsSection
                                title="Bónus"
                                limits={user.limits.bonusAccount}
                                barColor="bg-yellow-600"
                              />
                            )}
                          </div>
                        </div>

                        {/* Invoices List */}
                        <h4 className="text-lg font-medium text-gray-900 mb-4">
                          Despesas
                        </h4>

                        {loadingInvoices ? (
                          <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
                          </div>
                        ) : invoiceError ? (
                          <div
                            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
                            role="alert"
                          >
                            <span className="block sm:inline">
                              {invoiceError}
                            </span>
                          </div>
                        ) : userInvoices.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-gray-500">
                              Este colaborador não tem despesas registadas.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
                            <table className="w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                  >
                                    Fornecedor
                                  </th>
                                  <th
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                  >
                                    Valor
                                  </th>
                                  <th
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                  >
                                    Data
                                  </th>
                                  <th
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                  >
                                    Tipo
                                  </th>
                                  <th
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                  >
                                    Estado
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {userInvoices.map((invoice) => (
                                  <tr
                                    key={invoice.id}
                                    className="hover:bg-gray-50"
                                  >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">
                                        {invoice.vendor}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {invoice.description.substring(0, 30)}
                                        ...
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">
                                        {invoice.amount.toFixed(2)}€
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">
                                        {new Date(
                                          invoice.date,
                                        ).toLocaleDateString("pt-PT")}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">
                                        {invoice.type === "company"
                                          ? "Empresa"
                                          : invoice.type === "bonus"
                                            ? "Bónus"
                                            : "Benefícios"}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          invoice.status === "approved"
                                            ? "bg-green-100 text-green-800"
                                            : invoice.status === "rejected"
                                              ? "bg-red-100 text-red-800"
                                              : "bg-yellow-100 text-yellow-800"
                                        }`}
                                      >
                                        {invoice.status === "approved"
                                          ? "Aprovada"
                                          : invoice.status === "rejected"
                                            ? "Rejeitada"
                                            : "Pendente"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
