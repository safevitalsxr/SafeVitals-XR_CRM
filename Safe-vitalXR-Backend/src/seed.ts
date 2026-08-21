import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RolesService } from './roles/roles.service';
import { EmployeesService } from './employees/employees.service';
import { DepartmentsService } from './departments/departments.service';
import { TeamsService } from './teams/teams.service';
import { PositionsService } from './positions/positions.service';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const config = app.get(ConfigService);

  const isProd = config.get<string>('NODE_ENV') === 'production';
  const allowProdSeed = config.get<string>('ALLOW_PRODUCTION_SEED') === 'true';

  if (isProd && !allowProdSeed) {
    console.warn('⚠️ Seeding is disabled in production environments without ALLOW_PRODUCTION_SEED=true.');
    await app.close();
    return;
  }

  const roles = app.get(RolesService);
  const employees = app.get(EmployeesService);
  const depts = app.get(DepartmentsService);
  const teams = app.get(TeamsService);
  const positions = app.get(PositionsService);

  console.log('🌱 Seeding system roles...');
  await roles.seedSystemRoles();

  console.log('🌱 Creating HQ department...');
  let dept = (await depts.findAll()).find((d) => d.name === 'HQ');
  if (!dept) {
    dept = await depts.create({ name: 'HQ', description: 'Headquarters' });
  }

  console.log('🌱 Creating Executive team...');
  let team = (await teams.findAll(dept._id.toString())).find((t) => t.name === 'Executives');
  if (!team) {
    team = await teams.create('Executives', dept._id.toString());
  }

  console.log('🌱 Creating CEO position...');
  let pos = (await positions.findAll(dept._id.toString())).find((p) => p.name === 'CEO');
  if (!pos) {
    pos = await positions.create({ name: 'CEO', departmentId: dept._id.toString(), level: 'Head' });
  }

  const superAdminRole = (await roles.findAll()).find((r) => r.name === 'Super Admin');

  const adminEmail = config.get<string>('SUPERADMIN_EMAIL') || 'admin@safevitals.com';
  const adminPassword = config.get<string>('SUPERADMIN_INITIAL_PASSWORD') || 'SafeVitalsAdmin@2026!';

  console.log(`🌱 Initializing Super Admin Employee (${adminEmail})...`);
  try {
    const admin = await employees.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: adminEmail,
      temporaryPassword: adminPassword,
      departmentId: dept._id.toString(),
      teamId: team._id.toString(),
      positionId: pos._id.toString(),
      roleId: superAdminRole!._id.toString(),
    });
    console.log('✅ Super Admin account successfully initialized:', admin.employee.employeeId);
  } catch (err: any) {
    console.log('ℹ️ Admin account already exists or initialization skipped:', err.message);
  }

  await app.close();
  console.log('🌱 Seeding process complete.');
}
bootstrap();

