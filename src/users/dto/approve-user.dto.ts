import { IsString, IsOptional, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveUserDto {
  @ApiProperty({ description: 'The department ID to assign to the user' })
  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @ApiProperty({ description: 'The team ID to assign to the user', required: false })
  @IsOptional()
  @IsMongoId()
  teamId?: string;

  @ApiProperty({ description: 'The position ID to assign to the user', required: false })
  @IsOptional()
  @IsMongoId()
  positionId?: string;

  @ApiProperty({ description: 'The role ID to assign to the user', required: false })
  @IsOptional()
  @IsMongoId()
  roleId?: string;

  @ApiProperty({ description: 'The manager ID to assign to the user', required: false })
  @IsOptional()
  @IsMongoId()
  managerId?: string;
}
