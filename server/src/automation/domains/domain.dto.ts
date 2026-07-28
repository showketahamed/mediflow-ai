import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateLabOrderDto {
  @ApiProperty() @IsString() displayCode: string;
  @ApiProperty() @IsString() patientId: string;
  @ApiProperty() @IsString() testName: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 10 }) @IsOptional() @IsInt() @Min(1) @Max(10) priority?: number;
}
export class CompleteLabOrderDto {
  @ApiProperty() @IsObject() result: Record<string, unknown>;
}
export class CreatePharmacyOrderDto {
  @ApiProperty() @IsString() displayCode: string;
  @ApiProperty() @IsString() patientId: string;
  @ApiProperty() @IsString() medication: string;
  @ApiProperty() @IsString() dosage: string;
  @ApiProperty() @IsInt() @Min(1) quantity: number;
  @ApiProperty() @IsString() instructions: string;
}
export class AllocateBedDto {
  @ApiProperty() @IsString() admissionId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bedType?: string;
}
export class CreateEmergencyDto {
  @ApiProperty() @IsString() displayCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() patientId?: string;
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) severity: number;
  @ApiProperty() @IsString() description: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
}
export class CreateFollowUpDto {
  @ApiProperty() @IsString() patientId: string;
  @ApiProperty() @IsString() reason: string;
  @ApiProperty() @IsDateString() scheduledAt: string;
  @ApiProperty({ enum: ["EMAIL", "SMS", "IN_APP"] }) @IsString() @IsIn(["EMAIL", "SMS", "IN_APP"]) channel: string;
}
