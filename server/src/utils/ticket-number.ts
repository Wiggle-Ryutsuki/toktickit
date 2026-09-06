/**
 * Formats a ticket number according to BR-01: TKT-YYYY-NNNNN
 * where YYYY is the creation year and NNNNN is a 5-digit zero-padded sequence.
 */
export function formatTicketNumber(year: number, sequence: number): string {
  if (typeof year !== "number" || year < 2000 || isNaN(year)) {
    throw new Error(`Invalid year: ${year}. Year must be a valid number >= 2000.`);
  }

  if (typeof sequence !== "number" || sequence <= 0 || !Number.isInteger(sequence)) {
    throw new Error(`Invalid sequence: ${sequence}. Sequence must be a positive integer.`);
  }

  const paddedSequence = String(sequence).padStart(5, "0");
  return `TKT-${year}-${paddedSequence}`;
}
