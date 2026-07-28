import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AutomationType } from "@prisma/client";
import { AutomationStatus } from "@prisma/client";
import { IsEnum, IsInt, IsObject, IsOptional, IsString, Max, Min } from "class-validator";

export class DispatchAutomationDto {
  @ApiProperty({ enum: AutomationType }) @IsEnum(AutomationType) type: AutomationType;
  @ApiProperty() @IsString() eventName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() entityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() entityId?: string;
  @ApiProperty() @IsObject() payload: Record<string, unknown>;
  @ApiPropertyOptional({ minimum: 1, maximum: 10 }) @IsOptional() @IsInt() @Min(1) @Max(10) priority?: number;
  @ApiPropertyOptional({ minimum: 0, maximum: 2147000000 }) @IsOptional() @IsInt() @Min(0) @Max(2_147_000_000) delayMs?: number;
}

export class ListAutomationRunsDto {
  @ApiPropertyOptional({ enum: AutomationStatus }) @IsOptional() @IsEnum(AutomationStatus) status?: AutomationStatus;
  @ApiPropertyOptional({ enum: AutomationType }) @IsOptional() @IsEnum(AutomationType) type?: AutomationType;
}
