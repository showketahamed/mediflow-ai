import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from "class-validator";

const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export class LoginDto {
  @ApiProperty({ example: "admin@mediflow.demo" })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: "Mediflow123!" })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  remember?: boolean;

  @ApiPropertyOptional({ description: "UI hint only; authorization always uses the stored role." })
  @IsOptional()
  @IsString()
  role?: string;
}

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(STRONG_PASSWORD, { message: "Password must include uppercase, lowercase, number, and special characters." })
  password: string;

  @ApiPropertyOptional({ description: "Accepted for UI compatibility; public accounts are always Patient." })
  @IsOptional()
  @IsString()
  role?: string;
}

export class VerifyOtpDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: "246810" })
  @IsString()
  @Length(6, 6)
  otp: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty()
  @IsString()
  @Length(6, 128)
  token: string;

  @ApiProperty()
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(STRONG_PASSWORD, { message: "Password must include uppercase, lowercase, number, and special characters." })
  password: string;
}
