export interface FieldError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  fieldErrors: FieldError[];
}

export const VALID_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export function validateCreateTicketInput(input: {
  requesterId?: any;
  categoryId?: any;
  relatedSystemId?: any;
  requestedPriority?: any;
  summary?: any;
  description?: any;
}): ValidationResult {
  const fieldErrors: FieldError[] = [];

  // Summary validation
  if (typeof input.summary !== "string" || !input.summary.trim()) {
    fieldErrors.push({
      field: "summary",
      message: "Summary is required and cannot be empty.",
    });
  } else {
    const trimmedSummary = input.summary.trim();
    if (trimmedSummary.length < 5 || trimmedSummary.length > 120) {
      fieldErrors.push({
        field: "summary",
        message: "Summary must be between 5 and 120 characters.",
      });
    }
  }

  // Description validation
  if (typeof input.description !== "string" || !input.description.trim()) {
    fieldErrors.push({
      field: "description",
      message: "Description is required and cannot be empty.",
    });
  } else {
    const trimmedDesc = input.description.trim();
    if (trimmedDesc.length < 10 || trimmedDesc.length > 2000) {
      fieldErrors.push({
        field: "description",
        message: "Description must be between 10 and 2000 characters.",
      });
    }
  }

  // Priority validation
  if (
    typeof input.requestedPriority !== "string" ||
    !VALID_PRIORITIES.has(input.requestedPriority)
  ) {
    fieldErrors.push({
      field: "requestedPriority",
      message: "Requested Priority must be one of: LOW, MEDIUM, HIGH, URGENT.",
    });
  }

  // Requester ID validation
  const requesterId = Number(input.requesterId);
  if (!Number.isInteger(requesterId) || requesterId <= 0) {
    fieldErrors.push({
      field: "requesterId",
      message: "Requester ID must be a positive integer.",
    });
  }

  // Category ID validation
  const categoryId = Number(input.categoryId);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    fieldErrors.push({
      field: "categoryId",
      message: "Category ID must be a positive integer.",
    });
  }

  // Related System ID validation
  const relatedSystemId = Number(input.relatedSystemId);
  if (!Number.isInteger(relatedSystemId) || relatedSystemId <= 0) {
    fieldErrors.push({
      field: "relatedSystemId",
      message: "Related System ID must be a positive integer.",
    });
  }

  return {
    valid: fieldErrors.length === 0,
    fieldErrors,
  };
}
