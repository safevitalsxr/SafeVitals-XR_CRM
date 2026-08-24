import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Users (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post(':id/approve')
  @Roles('Super Admin', 'Admin')
  @ApiOperation({ summary: 'Approve a pending user registration' })
  async approveUser(@Param('id') id: string) {
    const user = await this.usersService.approveUser(id);
    return {
      message: 'User approved successfully',
      userId: user._id,
      firebaseUid: user.firebaseUid,
    };
  }
}
