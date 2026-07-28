import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsString } from "class-validator";

export class UpdateSettingsDto {
  @ApiProperty({ enum: ["dark", "darker"] }) @IsString() @IsIn(["dark", "darker"]) theme: string;
  @ApiProperty() @IsBoolean() notificationsEnabled: boolean;
  @ApiProperty({ enum: ["en", "es", "bn"] }) @IsString() @IsIn(["en", "es", "bn"]) language: string;
  @ApiProperty() @IsBoolean() reducedMotion: boolean;
}
