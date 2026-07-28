import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/current-user.decorator";
import { RequirePermissions } from "../../common/permissions.decorator";
import type { AuthUser } from "../../common/types";
import { CreatePatientDto, UpdatePatientDto, UpdatePatientStatusDto } from "./patients.dto";
import { PatientsService } from "./patients.service";

@ApiTags("Patients")
@ApiBearerAuth()
@Controller("patients")
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get() @RequirePermissions("patients:read")
  list(@CurrentUser() user: AuthUser) { return this.patients.list(user); }

  @Get(":id") @RequirePermissions("patients:read")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) { return this.patients.get(user, id); }

  @Post() @RequirePermissions("patients:create")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePatientDto) { return this.patients.create(user, dto); }

  @Put(":id") @RequirePermissions("patients:update")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdatePatientDto) { return this.patients.update(user, id, dto); }

  @Patch(":id/status") @RequirePermissions("patients:update")
  status(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdatePatientStatusDto) { return this.patients.updateStatus(user, id, dto.status); }

  @Delete(":id") @RequirePermissions("patients:delete")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) { return this.patients.remove(user, id); }
}
