import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EmployeesService } from '../employees/employees.service';
import { AttendanceService } from '../attendance/attendance.service';
import { TasksService } from '../tasks/tasks.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SchedulesService } from '../schedules/schedules.service';

@ApiTags('Mobile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mobile')
export class MobileController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly attendanceService: AttendanceService,
    private readonly tasksService: TasksService,
    private readonly notificationsService: NotificationsService,
    private readonly schedulesService: SchedulesService,
  ) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Single round-trip aggregated mobile dashboard',
    description: 'Returns profile, today attendance status, assigned tasks, unread notifications, and work schedule in 1 fast request to minimize mobile battery and data usage.',
  })
  async getMobileDashboard(@CurrentUser('_id') userId: string) {
    const uid = userId.toString();

    // 1. Fetch Employee Profile
    let employee: any = null;
    try {
      employee = await this.employeesService.findByUserId(uid);
    } catch {
      // User might be super admin without an employee doc
    }

    const employeeId = employee?._id?.toString();

    // 2. Fetch all dependent mobile widgets in parallel
    const [attendanceToday, tasksResult, unreadCount, recentNotifications] = await Promise.all([
      employeeId ? this.attendanceService.getTodayStatus(employeeId) : null,
      employeeId ? this.tasksService.findAll(employeeId, undefined, 1, 5) : { data: [], total: 0 },
      this.notificationsService.countUnread(uid),
      this.notificationsService.findByUser(uid, 1, 3),
    ]);

    // 3. Fetch schedule details if employee has one
    let schedule: any = null;
    if (employee?.workScheduleId) {
      try {
        const scheduleId = typeof employee.workScheduleId === 'object' && employee.workScheduleId._id
          ? employee.workScheduleId._id.toString()
          : employee.workScheduleId.toString();
        schedule = await this.schedulesService.findById(scheduleId);
      } catch {
        schedule = null;
      }
    }

    // 4. Determine mobile quick-action state
    const attendanceStatus = attendanceToday?.status || 'Absent';
    const canCheckIn = !attendanceToday || !attendanceToday.checkInAt;
    const canStartBreak = attendanceToday?.checkInAt && attendanceStatus === 'Working';
    const canEndBreak = attendanceStatus === 'On Break';
    const canCheckOut = attendanceToday?.checkInAt && attendanceStatus !== 'Checked Out';

    return {
      success: true,
      timestamp: new Date().toISOString(),
      profile: {
        userId: uid,
        employeeId: employee?.employeeId || null,
        fullName: employee?.userId ? `${employee.userId.firstName} ${employee.userId.lastName}` : 'Safe Vitals User',
        email: employee?.userId?.email || null,
        avatar: employee?.userId?.avatar || null,
        department: employee?.departmentId?.name || null,
        team: employee?.teamId?.name || null,
        position: employee?.positionId?.name || null,
      },
      attendance: {
        record: attendanceToday,
        status: attendanceStatus,
        checkInAt: attendanceToday?.checkInAt || null,
        checkOutAt: attendanceToday?.checkOutAt || null,
        workingMinutes: attendanceToday?.workingMinutes || 0,
        breakMinutes: attendanceToday?.breakMinutes || 0,
        quickActions: {
          canCheckIn,
          canStartBreak,
          canEndBreak,
          canCheckOut,
        },
      },
      schedule: schedule
        ? {
            id: schedule._id,
            name: schedule.name,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            workDays: schedule.workDays,
          }
        : null,
      tasks: {
        totalPending: tasksResult.total,
        recent: tasksResult.data,
      },
      notifications: {
        unreadCount,
        recent: recentNotifications.data,
      },
    };
  }
}
