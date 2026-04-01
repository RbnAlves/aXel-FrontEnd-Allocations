import { useRef } from "react";

/**
 * Custom hook for handling form validation with auto-scroll to first error
 * Provides enhanced UX for form submission failures, especially on mobile
 */
export const useFormValidation = (
  fieldIdMap: Record<string, string>,
  options?: { scrollOnDesktop?: boolean }
) => {
  const formRef = useRef<HTMLFormElement>(null);
  const firstErrorKeyRef = useRef<string | null>(null);
  const scrollOnDesktop = options?.scrollOnDesktop ?? true;

  /**
   * Scroll to the first failing field and focus it with animation
   */
  const scrollToFirstError = (firstErrorKey: string | null) => {
    if (!firstErrorKey || !formRef.current) return;

    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile && !scrollOnDesktop) return;

    // Get the field ID from the mapping
    const fieldId = fieldIdMap[firstErrorKey];
    if (!fieldId) return;

    // Find the element by ID
    const element = document.getElementById(fieldId);
    if (!element) return;

    // Store the first error key for reference
    firstErrorKeyRef.current = firstErrorKey;

    // Scroll smoothly into view
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    // Focus the element if it's focusable
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement
    ) {
      setTimeout(() => {
        element.focus();
        // Add visual feedback with ring animation
        element.classList.add("ring-2", "ring-red-500", "animate-pulse");
        // Remove animation after 2 seconds
        setTimeout(() => {
          element.classList.remove("animate-pulse");
        }, 2000);
      }, 300); // Wait for scroll to complete
    }
  };

  /**
   * Get the first error key from the errors object
   */
  const getFirstErrorKey = (errors: Record<string, string>): string | null => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length === 0) return null;

    // Return the first error key based on field order
    const fieldOrder = Object.keys(fieldIdMap);
    for (const fieldName of fieldOrder) {
      if (errors[fieldName]) {
        return fieldName;
      }
    }

    // Fallback to first error if not in map
    return errorKeys[0];
  };

  return {
    formRef,
    scrollToFirstError,
    getFirstErrorKey,
    firstErrorKeyRef,
  };
};
