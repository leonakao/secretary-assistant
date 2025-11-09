import { Injectable, Logger } from '@nestjs/common';
import {
  ActionExecutorService,
  ActionExecutionResult,
} from '../services/action-executor.service';
import { Action } from '../types/action.types';
import { ExecuteActionDto } from '../dto/execute-action.dto';

@Injectable()
export class ExecuteActionUseCase {
  private readonly logger = new Logger(ExecuteActionUseCase.name);

  constructor(private readonly actionExecutorService: ActionExecutorService) {}

  async execute(dto: ExecuteActionDto): Promise<ActionExecutionResult> {
    const action: Action = {
      type: dto.type,
      payload: dto.payload,
      confidence: 1.0,
    } as Action;

    const results = await this.actionExecutorService.executeActions(
      [action],
      dto.context,
    );

    const result = results[0];

    if (!result.success) {
      throw new Error(result.error);
    }

    return result;
  }
}
