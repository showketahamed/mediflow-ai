import { ApiProperty, PartialType } from "@nestjs/swagger";
import { AppointmentStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateAppointmentDto {
  @ApiProperty() @IsOptional() @IsString() patientId?: string;
  @ApiProperty() @IsString() displayCode: string;
  @ApiProperty() @IsString() patient: string;
  @ApiProperty() @IsString() type: string;
  @ApiProperty() @IsString() doctor: string;
  @ApiProperty() @IsString() room: string;
  @ApiProperty() @IsDateString() start: string;
  @ApiProperty() @IsDateString() end: string;
  @ApiProperty({ enum: AppointmentStatus }) @IsEnum(AppointmentStatus) status: AppointmentStatus;
  @ApiProperty() @IsString() notes: string;
}

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {}
