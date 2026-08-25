import { IsString, IsEmail, IsOptional, IsMongoId, IsDateString, IsEnum, MaxLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus } from '../../users/schemas/user.schema';

export class CreateEmployeeDto {
  @ApiProperty() @IsString() firstName: string;
  @ApiProperty() @IsString() lastName: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() teamId?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() positionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() roleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() managerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() workScheduleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() temporaryPassword?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() joiningDate?: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @ValidateIf(o => o.departmentId !== '' && o.departmentId !== null) @IsMongoId() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @ValidateIf(o => o.teamId !== '' && o.teamId !== null) @IsMongoId() teamId?: string;
  @ApiPropertyOptional() @IsOptional() @ValidateIf(o => o.positionId !== '' && o.positionId !== null) @IsMongoId() positionId?: string;
  @ApiPropertyOptional() @IsOptional() @ValidateIf(o => o.roleId !== '' && o.roleId !== null) @IsMongoId() roleId?: string;
  @ApiPropertyOptional() @IsOptional() @ValidateIf(o => o.managerId !== '' && o.managerId !== null) @IsMongoId() managerId?: string;
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

export class OnboardEmployeeByUidDto {
  @ApiProperty({ example: 'd8F1k9LmP02Xq9Za', description: 'Unique Firebase Authentication UID' })
  @IsString()
  firebaseUid: string;

  @ApiPropertyOptional({ description: 'Assigned Department MongoDB ID' })
  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Assigned Team MongoDB ID' })
  @IsOptional()
  @IsMongoId()
  teamId?: string;

  @ApiPropertyOptional({ description: 'Assigned Position MongoDB ID' })
  @IsOptional()
  @IsMongoId()
  positionId?: string;

  @ApiPropertyOptional({ description: 'Assigned Role MongoDB ID' })
  @IsOptional()
  @IsMongoId()
  roleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  managerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  workScheduleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joiningDate?: string;
}
