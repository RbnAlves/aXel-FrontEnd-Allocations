import React from "react";
import { ShieldAlert, ArrowLeft } from "lucide-react";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

/**
 * Generic component to display when a user doesn't have permission to access content
 */
export const AccessDenied: React.FC<AccessDeniedProps> = ({
  title = "Acesso Negado",
  message = "Não tem permissão para aceder a esta página. Entre em contacto com o administrador do sistema se acredita que isto é um erro.",
  showBackButton = true,
  onBack,
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-100 rounded-full">
            <ShieldAlert className="h-16 w-16 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>

        {/* Message */}
        <p className="text-base text-gray-600 mb-8">{message}</p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Voltar
            </button>
          )}

          <button
            onClick={() => (window.location.href = "/")}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
          >
            Ir para Dashboard
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Precisa de ajuda?{" "}
            <a
              href="mailto:support@mote.consulting"
              className="font-medium text-yellow-600 hover:text-yellow-500"
            >
              Contacte o suporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
