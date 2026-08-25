import { Controller, Post, Param, UseGuards, Get, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApproveUserDto } from './dto/approve-user.dto';

@ApiTags('Users (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('pending')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Get all pending registrations' })
  async getPendingUsers() {
    return this.usersService.getPendingUsers();
  }

  @Post(':id/approve')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Approve a pending user registration' })
  async approveUser(@Param('id') id: string, @Body() body: ApproveUserDto) {
    const user = await this.usersService.approveUser(id, body);
    return {
      message: 'User approved successfully',
      userId: user._id,
      firebaseUid: user.firebaseUid,
    };
  }
}

