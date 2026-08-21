import { IsString, IsEmail, IsOptional, IsMongoId, IsDateString, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus } from '../../users/schemas/user.schema';

export class CreateEmployeeDto {
  @ApiProperty() @IsString() firstName: string;
  @ApiProperty() @IsString() lastName: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsMongoId() departmentId: string;
  @ApiProperty() @IsMongoId() teamId: string;
  @ApiProperty() @IsMongoId() positionId: string;
  @ApiProperty() @IsMongoId() roleId: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() managerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() workScheduleId?: string;
  @ApiProperty() @IsString() temporaryPassword: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() joiningDate?: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() teamId?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() positionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() roleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() managerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
}

export class EmployeeQueryDto {
  @IsOptional() @IsString() @MaxLength(10) page?: string;
  @IsOptional() @IsString() @MaxLength(10) limit?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsMongoId() departmentId?: string;
  @IsOptional() @IsMongoId() teamId?: string;
  @IsOptional() @IsEnum(AccountStatus) status?: AccountStatus;
}
