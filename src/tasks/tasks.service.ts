import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { toObjectId } from '../common/utils/mongo.util';
import { EmailService } from '../common/email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectModel(Task.name) private model: Model<TaskDocument>,
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
  ) {}

  async create(data: any, assignedByName?: string) {
    const task = { ...data };
    if (data.assignedTo) task.assignedTo = toObjectId(data.assignedTo) as any;
    if (data.assignedBy) task.assignedBy = toObjectId(data.assignedBy) as any;
    if (data.departmentId) task.departmentId = toObjectId(data.departmentId) as any;
    if (data.teamId) task.teamId = toObjectId(data.teamId) as any;
    const created = await this.model.create(task);

    if (data.assignedTo) {
      const dueDateStr = created.dueDate ? new Date(created.dueDate).toISOString().split('T')[0] : undefined;
      this.notifyAssignment(data.assignedTo, created.title, assignedByName, dueDateStr, created.priority)
        .catch((err) => this.logger.error(`Failed to notify task assignment: ${err.message}`, err.stack));
    }

    return created;
  }

  private async notifyAssignment(
    assignedToEmployeeId: string,
    taskTitle: string,
    assignedByName?: string,
    dueDate?: string,
    priority?: string,
  ) {
    const employee = await this.employeeModel.findById(assignedToEmployeeId).populate('userId').lean().exec();
    const assigneeUser: any = employee?.userId;
    if (!assigneeUser) return;

    await this.notificationsService.create({
      userId: assigneeUser._id.toString(),
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: `${assignedByName || 'Someone'} assigned you a task: "${taskTitle}"`,
      link: '/app/tasks',
    });

    if (assigneeUser.email) {
      await this.emailService.sendTaskAssigned(
        assigneeUser.email,
        assigneeUser.firstName || 'Team Member',
        taskTitle,
        assignedByName,
        dueDate,
        priority,
      );
    }
  }

  async findAll(employeeId?: string, status?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (employeeId) filter.assignedTo = toObjectId(employeeId);
    if (status) filter.status = status;
    const [docs, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('assignedTo').lean(),
      this.model.countDocuments(filter),
    ]);
    const data = docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    return { data, total, page, limit };
  }

  async findById(id: string): Promise<TaskDocument> {
    const task = await this.model.findById(id).populate('assignedTo').exec();
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async delete(id: string) {
    const t = await this.model.findByIdAndDelete(id).exec();
    if (!t) throw new NotFoundException('Task not found');
    return { success: true };
  }

  async updateStatus(id: string, status: string, completionReport?: string, assigneeName?: string) {
    const update: any = { status };
    if (status === 'Done') {
      update.completionReport = completionReport;
      update.completedAt = new Date();
    }
    const task = await this.model.findByIdAndUpdate(id, update, { new: true }).exec();
    if (!task) throw new NotFoundException('Task not found');

    if (status === 'Done') {
      this.notifyCompletion(task, assigneeName)
        .catch((err) => this.logger.error(`Failed to notify task completion: ${err.message}`, err.stack));
    }

    return task;
  }

  private async notifyCompletion(task: TaskDocument, assigneeName?: string) {
    const assigner = await this.employeeModel.findById(task.assignedBy).populate('userId').lean().exec();
    const assignerUser: any = assigner?.userId;
    if (!assignerUser) return;

    await this.notificationsService.create({
      userId: assignerUser._id.toString(),
      type: 'TASK_COMPLETED',
      title: 'Task Completed',
      message: `${assigneeName || 'Someone'} completed "${task.title}": ${task.completionReport}`,
      link: '/app/tasks',
    });
  }

  async update(id: string, data: any) {
    const task = await this.model.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }
}
