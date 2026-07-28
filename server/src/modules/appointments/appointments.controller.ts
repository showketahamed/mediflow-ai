import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/current-user.decorator";
import { RequirePermissions } from "../../common/permissions.decorator";
import type { AuthUser } from "../../common/types";
import { CreateAppointmentDto, UpdateAppointmentDto } from "./appointments.dto";
import { AppointmentsService } from "./appointments.service";

@ApiTags("Appointments")
@ApiBearerAuth()
@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}
  @Get() @RequirePermissions("appointments:read")
  list(@CurrentUser() user: AuthUser) { return this.appointments.list(user); }
  @Post() @RequirePermissions("appointments:create")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAppointmentDto) { return this.appointments.create(user, dto); }
  @Put(":id") @RequirePermissions("appointments:update")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateAppointmentDto) { return this.appointments.update(user, id, dto); }
  @Delete(":id") @RequirePermissions("appointments:delete")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) { return this.appointments.remove(user, id); }
}
