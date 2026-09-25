import argon2 from "argon2";

export const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters long.");
  }

  if (password && password.length > 128) {
    errors.push("Password cannot exceed 128 characters.");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter.");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter.");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number.");
  }

  if (!SPECIAL_CHAR_REGEX.test(password)) {
    errors.push("Password must contain at least one special character.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export async function hashPassword(password: string): Promise<string> {
  const isTest = process.env.NODE_ENV === "test";
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: isTest ? 4096 : 65536,
    timeCost: isTest ? 1 : 3,
    parallelism: isTest ? 1 : 4,
  });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
