import { ArgumentsHost, Catch, HttpException, HttpStatus, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';

type ExceptionPayload = { code?: string; message?: string | string[]; details?: unknown };

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : undefined;
    const payload: ExceptionPayload = typeof raw === 'object' && raw !== null ? raw as ExceptionPayload : {};
    const defaultMessage = status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal server error' : String(raw ?? 'Request failed');
    const message = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message ?? defaultMessage;
    response.status(status).json({
      error: {
        code: payload.code ?? (status === HttpStatus.NOT_FOUND ? 'NOT_FOUND' : `HTTP_${status}`),
        message,
        ...(payload.details === undefined ? {} : { details: payload.details }),
      },
    });
  }
}
