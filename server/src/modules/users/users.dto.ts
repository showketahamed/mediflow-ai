import { ApiProperty, PartialType } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreateUserDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(12) password: string;
  @ApiProperty() @IsString() title: string;
  @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) role: UserRole;
  @ApiProperty() @IsOptional() @IsUUID() hospitalId?: string;
  @ApiProperty() @IsOptional() @IsUUID() departmentId?: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty() @IsOptional() @IsBoolean() active?: boolean;
}
