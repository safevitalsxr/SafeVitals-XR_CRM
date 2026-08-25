import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.headers['x-request-id'] || 'req-' + Date.now();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred. Please try again later.';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && (exceptionResponse as any).message) {
        message = Array.isArray((exceptionResponse as any).message)
          ? (exceptionResponse as any).message.join(', ')
          : (exceptionResponse as any).message;
      }
      code = (exception.getResponse() as any).error || exception.constructor.name.replace('Exception', '').toUpperCase();
    } else if (exception instanceof Error) {
      // In development mode, provide message for debugging; in production, mask it
      if (process.env.NODE_ENV !== 'production') {
        message = exception.message;
      }
      this.logger.error(`[${requestId}] Unhandled exception on ${request.method} ${request.url}: ${exception.message}`, exception.stack);
    } else {
      this.logger.error(`[${requestId}] Unknown exception thrown: ${String(exception)}`);
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
      },
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

