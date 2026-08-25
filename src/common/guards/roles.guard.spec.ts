import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(user: any): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as any;
  }

  it('should allow access if no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockContext({ role: 'Employee' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow Super Admin regardless of specified roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Admin']);
    const context = createMockContext({ role: 'Super Admin', isSuperAdmin: true });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow user with matching role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Admin', 'HR Admin']);
    const context = createMockContext({ role: 'Admin', isSuperAdmin: false });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject user with insufficient role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Admin']);
    const context = createMockContext({ role: 'Employee', isSuperAdmin: false });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
