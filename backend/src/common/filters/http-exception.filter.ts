import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx  = host.switchToHttp();
    const res  = ctx.getResponse<Response>();
    const req  = ctx.getRequest<Request>();

    let status  = HttpStatus.INTERNAL_SERVER_ERROR;
    let error   = 'server_error';
    let message = 'An unexpected error occurred. Please try again.';
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as any;

      if (typeof body === 'object') {
        error   = body.error   || this.statusToCode(status);
        message = body.message || message;
        if (Array.isArray(body.message)) {
          errors  = { validation: body.message };
          message = 'Validation failed.';
          error   = 'validation_error';
        }
        if (body.errors) errors = body.errors;
      } else {
        message = body as string;
        error   = this.statusToCode(status);
      }
    } else {
      // Never expose internal errors
      this.logger.error(
        `Unhandled exception on ${req.method} ${req.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({
      success: false,
      data:    null,
      error,
      message,
      ...(errors ? { errors } : {}),
    });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'bad_request',
      401: 'unauthorized',
      403: 'forbidden',
      404: 'not_found',
      409: 'conflict',
      422: 'validation_error',
      429: 'too_many_requests',
      500: 'server_error',
    };
    return map[status] || 'error';
  }
}
