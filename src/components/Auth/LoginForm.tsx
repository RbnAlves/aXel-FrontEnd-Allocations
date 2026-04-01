import React, { useState } from "react";
import { Shield, LogIn } from "lucide-react";
import { authService } from "../../services";
import { User } from "@/types";

interface LoginFormProps {
  onLogin: (user: User) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);

    try {
      // Login with Azure AD
      const user = await authService.login();
      onLogin(user);
    } catch (error) {
      console.error("Login error:", error);
      alert("Failed to login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center ">
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center">
                <img src="/mote.png" alt="logo mote" />
              </div>
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">AXEL</h2>
          <p className="mt-2 text-sm text-gray-600">
            Allocation • eXpenses • Engagements • Leaves
          </p>
          <p className="mt-1 text-xs text-gray-500">mote.consulting platform</p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-lg">
          <div className="flex items-center justify-center mb-6">
            <Shield className="w-6 h-6 text-yellow-500 mr-2" />
            <span className="text-lg font-medium text-gray-900">
              Iniciar Sessão
            </span>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="text-center text-sm text-gray-600 mb-4">
              <p>
                Carregue no botão abaixo para autenticar com a sua conta da
                mote.consulting.
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Apenas utilizadores da organização mote.consulting são
                permitidos.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  A autenticar...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar
                </div>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
