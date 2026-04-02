import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    timestamp: string;
    path: string;
  };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode = this.getStatusCode(exception);
    const message = this.getErrorMessage(exception);
    const code = this.getErrorCode(exception);

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        message,
        code,
        statusCode,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    this.logger.error(
      `${request.method} ${request.url} - ${statusCode} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(statusCode).json(errorResponse);
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    if (this.isPayloadTooLargeError(exception)) {
      return HttpStatus.PAYLOAD_TOO_LARGE;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getErrorMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (typeof response === 'object' && 'message' in response) {
        const message = (response as any).message;
        return Array.isArray(message) ? message.join(', ') : message;
      }
    }
    if (
      exception &&
      typeof exception === 'object' &&
      'message' in exception &&
      typeof exception.message === 'string'
    ) {
      return exception.message;
    }
    if (exception instanceof Error) {
      return exception.message;
    }
    return 'Internal server error';
  }

  private getErrorCode(exception: unknown): string {
    if (exception instanceof HttpException) {
      return exception.constructor.name;
    }
    if (this.isPayloadTooLargeError(exception)) {
      return 'PayloadTooLargeError';
    }
    if (exception instanceof Error) {
      return exception.constructor.name;
    }
    return 'UnknownError';
  }

  private isPayloadTooLargeError(exception: unknown): boolean {
    if (!exception || typeof exception !== 'object') {
      return false;
    }

    const code =
      'type' in exception && typeof exception.type === 'string'
        ? exception.type
        : undefined;
    const status =
      'status' in exception && typeof exception.status === 'number'
        ? exception.status
        : undefined;
    const statusCode =
      'statusCode' in exception && typeof exception.statusCode === 'number'
        ? exception.statusCode
        : undefined;

    return (
      code === 'entity.too.large' ||
      status === HttpStatus.PAYLOAD_TOO_LARGE ||
      statusCode === HttpStatus.PAYLOAD_TOO_LARGE
    );
  }
}
