import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, IsUUID, Length, MaxLength } from "class-validator";

export class ChatDto {
  @ApiProperty({ maxLength: 4000 })
  @IsString() @Length(1, 4000)
  message: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  conversationId?: string;
}

export class AppointmentAssistantDto {
  @ApiProperty({ maxLength: 2000 })
  @IsString() @Length(1, 2000)
  request: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(64)
  patientId?: string;
}

export class DiagnosisSuggestionDto {
  @ApiProperty()
  @IsString() @Length(1, 64)
  patientId: string;

  @ApiProperty({ maxLength: 5000 })
  @IsString() @Length(3, 5000)
  symptoms: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(5000)
  clinicalContext?: string;
}

export class ReportSummaryDto {
  @ApiProperty({ maxLength: 20000 })
  @IsString() @Length(10, 20000)
  report: string;
}

export class AiAnalyticsDto {
  @ApiPropertyOptional({ enum: ["7d", "30d", "90d"] })
  @IsOptional() @IsIn(["7d", "30d", "90d"])
  range: "7d" | "30d" | "90d" = "30d";
}

