import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip, body } = req;
    const startTime = Date.now();

    // Capture response body
    const originalSend = res.send;
    let responseBody: any;

    res.send = function (data: any): Response {
      responseBody = data;
      return originalSend.call(this, data);
    };

    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;

      // Build log message parts
      const parts = [
        `${method} ${originalUrl}`,
        `${statusCode}`,
        `${responseTime}ms`,
        `${ip}`,
      ];

      // Add request body if present
      if (body && Object.keys(body).length > 0) {
        parts.push(`ReqBody: ${JSON.stringify(body)}`);
      }

      // Add response body if present
      if (responseBody) {
        try {
          const parsedBody =
            typeof responseBody === 'string'
              ? JSON.parse(responseBody)
              : responseBody;
          parts.push(`ResBody: ${JSON.stringify(parsedBody)}`);
        } catch {
          parts.push(`ResBody: ${responseBody}`);
        }
      }

      const logMessage = parts.join(' | ');

      if (statusCode >= 500) {
        this.logger.error(logMessage);
      } else if (statusCode >= 400) {
        this.logger.warn(logMessage);
      } else {
        this.logger.log(logMessage);
      }
    });

    next();
  }
}
