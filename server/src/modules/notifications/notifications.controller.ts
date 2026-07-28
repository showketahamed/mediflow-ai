import { Controller, Delete, Get, Param, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/current-user.decorator";
import { RequirePermissions } from "../../common/permissions.decorator";
import type { AuthUser } from "../../common/types";
import { NotificationsService } from "./notifications.service";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
@RequirePermissions("notifications:read")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() list(@CurrentUser() user: AuthUser) { return this.notifications.list(user); }
  @Patch("read-all") readAll(@CurrentUser() user: AuthUser) { return this.notifications.readAll(user); }
  @Patch(":id/read") read(@CurrentUser() user: AuthUser, @Param("id") id: string) { return this.notifications.read(user, id); }
  @Delete(":id") remove(@CurrentUser() user: AuthUser, @Param("id") id: string) { return this.notifications.remove(user, id); }
}
