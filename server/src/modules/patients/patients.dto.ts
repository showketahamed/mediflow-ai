import { ApiProperty, PartialType } from "@nestjs/swagger";
import { PatientStatus } from "@prisma/client";
import { IsDateString, IsEmail, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class CreatePatientDto {
  @ApiProperty() @IsString() medicalId: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsInt() @Min(0) @Max(130) age: number;
  @ApiProperty({ enum: ["Female", "Male", "Non-binary"] }) @IsString() gender: string;
  @ApiProperty() @IsString() condition: string;
  @ApiProperty({ enum: PatientStatus }) @IsEnum(PatientStatus) status: PatientStatus;
  @ApiProperty() @IsString() ward: string;
  @ApiProperty() @IsString() doctor: string;
  @ApiProperty() @IsString() bloodPressure: string;
  @ApiProperty() @IsInt() @Min(0) heartRate: number;
  @ApiProperty() @IsNumber() temperature: number;
  @ApiProperty() @IsDateString() admissionDate: string;
  @ApiProperty() @IsString() phone: string;
  @ApiProperty() @IsOptional() @IsEmail() email?: string;
  @ApiProperty() @IsString() notes: string;
}

export class UpdatePatientDto extends PartialType(CreatePatientDto) {}

export class UpdatePatientStatusDto {
  @ApiProperty({ enum: PatientStatus })
  @IsEnum(PatientStatus)
  status: PatientStatus;
}
