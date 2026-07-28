import { ApiProperty } from "@nestjs/swagger";
import { DiagnosticStatus } from "@prisma/client";
import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpsertDiagnosticDto {
  @ApiProperty() @IsString() displayCode: string;
  @ApiProperty() @IsString() patientId: string;
  @ApiProperty() @IsString() scanType: string;
  @ApiProperty() @IsDateString() startedAt: string;
  @ApiProperty() @IsOptional() @IsDateString() completedAt?: string;
  @ApiProperty({ enum: DiagnosticStatus }) @IsEnum(DiagnosticStatus) status: DiagnosticStatus;
  @ApiProperty() @IsInt() @Min(0) @Max(100) progress: number;
  @ApiProperty() @IsString() summary: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) findings: string[];
  @ApiProperty() @IsString() recommendation: string;
}
