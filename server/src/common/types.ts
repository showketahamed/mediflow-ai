import type { UserRole } from "@prisma/client";

export interface AuthUser {
  sub: string;
  email: string;
  role: UserRole;
  hospitalId: string | null;
}
