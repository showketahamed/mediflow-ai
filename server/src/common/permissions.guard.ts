import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { UserRole } from "@prisma/client";
import { PERMISSIONS_KEY } from "./permissions.decorator";
import type { AuthUser } from "./types";

const ALL = ["*"];
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ALL,
  HOSPITAL_ADMIN: ["dashboard:read", "analytics:read", "audit:read", "users:manage", "patients:*", "appointments:*", "diagnostics:*", "notifications:*", "settings:*", "automations:*", "lab:*", "pharmacy:*", "beds:*", "emergencies:*", "followups:*", "ai:*"],
  DOCTOR: ["dashboard:read", "analytics:read", "patients:read", "patients:update", "appointments:*", "diagnostics:*", "notifications:*", "settings:*", "automations:monitor", "automations:dispatch", "lab:*", "pharmacy:create", "pharmacy:read", "beds:read", "beds:allocate", "emergencies:*", "followups:*", "ai:*"],
  NURSE: ["dashboard:read", "patients:read", "patients:update", "appointments:read", "diagnostics:read", "notifications:*", "settings:*", "automations:monitor", "lab:read", "beds:*", "emergencies:*", "followups:*", "ai:chat", "ai:patient-summary", "ai:appointment", "ai:ocr", "ai:voice", "ai:report"],
  RECEPTIONIST: ["dashboard:read", "patients:create", "patients:read", "patients:update", "appointments:*", "notifications:*", "settings:*", "automations:monitor", "beds:read", "beds:allocate", "followups:create", "followups:read", "ai:chat", "ai:receptionist", "ai:appointment"],
  LAB_TECHNICIAN: ["dashboard:read", "patients:read", "diagnostics:*", "notifications:*", "settings:*", "automations:monitor", "lab:*", "ai:chat", "ai:ocr", "ai:report"],
  PHARMACIST: ["dashboard:read", "patients:read", "diagnostics:read", "notifications:*", "settings:*", "automations:monitor", "pharmacy:*", "ai:chat", "ai:ocr", "ai:report"],
  PATIENT: ["dashboard:read", "patients:read", "appointments:read", "diagnostics:read", "notifications:*", "settings:*", "ai:chat", "ai:receptionist", "ai:appointment", "ai:patient-summary", "ai:report"],
};

function hasPermission(granted: string[], requested: string) {
  if (granted.includes("*") || granted.includes(requested)) return true;
  const [resource] = requested.split(":");
  return granted.includes(`${resource}:*`);
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requested = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requested?.length) return true;
    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!user || !requested.every((item) => hasPermission(ROLE_PERMISSIONS[user.role], item))) {
      throw new ForbiddenException("You do not have permission to perform this action.");
    }
    return true;
  }
}
