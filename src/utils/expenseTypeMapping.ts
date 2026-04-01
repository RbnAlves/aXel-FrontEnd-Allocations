/**
 * Maps expense type names to form types
 */
export type FormType = "default" | "travel" | "meal" | "perdiem" | "coverflex";

/**
 * Get the appropriate form type based on expense type name
 * @param expenseTypeName - The name of the expense type from the API
 * @returns The form type to render
 */
export function getFormTypeFromExpenseTypeName(
  expenseTypeName: string
): FormType {
  switch (expenseTypeName) {
    case "Viagens":
      return "travel";
    case "Refeições":
      return "meal";
    case "Ajudas de Custo":
      return "perdiem";
    case "Coverflex":
      return "coverflex";
    default:
      return "default";
  }
}

/**
 * Check if a form type supports file upload/OCR
 * @param formType - The form type
 * @returns True if the form supports file uploads
 */
export function formSupportsFileUpload(formType: FormType): boolean {
  return formType === "default" || formType === "meal";
}
