import { useState, useEffect } from "react";
import { doorAccessService } from "../../services/doorAccessService";
import { Button } from "../ui/button";
import {
  Loader2,
  DoorOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface DoorUnlockButtonProps {
  buttonText?: string;
  compact?: boolean;
}

export function DoorUnlockButton({
  buttonText = "Unlock Door",
  compact = false,
}: DoorUnlockButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setSuccess(false);
      setCountdown(null);
    }
  }, [countdown]);

  const handleUnlock = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await doorAccessService.unlockDoor();
      setSuccess(true);
      setCountdown(result.duration || 30); // Use backend duration or fallback to 30s
    } catch (err: any) {
      // Parse error message based on HTTP status
      const errorMessage = err.message || "Failed to unlock door";

      if (errorMessage.includes("Not on office network")) {
        setError("You must be on the office network to unlock the door");
      } else if (errorMessage.includes("Too many")) {
        setError("Too many unlock attempts. Please try again later");
      } else if (errorMessage.includes("door device")) {
        setError("Door device is offline. Please contact support");
      } else if (errorMessage.includes("disabled")) {
        setError("Door control is currently disabled");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Compact mode: Just button and inline messages
  if (compact) {
    return (
      <div className="flex flex-col gap-2 w-full">
        <Button
          onClick={handleUnlock}
          disabled={loading || success}
          className="w-full justify-center"
          variant={success ? "success" : "yellow"}
        >
          {loading && (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />A abrir...
            </>
          )}
          {success && countdown !== null && (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Aberto ({countdown}s)
            </>
          )}
          {!loading && !success && (
            <>
              <DoorOpen className="mr-2 h-4 w-4" />
              {buttonText}
            </>
          )}
        </Button>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-md text-red-800 text-xs">
            <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
      </div>
    );
  }

  // Full mode: Standalone component with header
  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-2">
          <DoorOpen className="h-6 w-6" />
          Door Control
        </h3>
        <p className="text-sm text-gray-600">Unlock the office door remotely</p>
      </div>

      <div className="space-y-4">
        {/* Main unlock button */}
        <Button
          onClick={handleUnlock}
          disabled={loading || success}
          className="w-full h-16 text-lg"
          variant={success ? "success" : "default"}
        >
          {loading && (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Unlocking...
            </>
          )}
          {success && countdown !== null && (
            <>
              <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
              Unlocked ({countdown}s)
            </>
          )}
          {!loading && !success && (
            <>
              <DoorOpen className="mr-2 h-5 w-5" />
              {buttonText}
            </>
          )}
        </Button>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-800">
            <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Success message with countdown */}
        {success && countdown !== null && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-800">
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              Door unlocked successfully. It will automatically lock in{" "}
              {countdown} seconds.
            </p>
          </div>
        )}

        {/* Info message */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">
            You must be connected to the office network (or VPN) to unlock the
            door.
          </p>
        </div>
      </div>
    </div>
  );
}
