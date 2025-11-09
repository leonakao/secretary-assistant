import { Body, Controller, Post } from '@nestjs/common';
import { ActionExecutionResult } from '../services/action-executor.service';
import { ExecuteActionDto } from '../dto/execute-action.dto';
import { ExecuteActionUseCase } from '../use-cases/execute-action.use-case';

@Controller('actions')
export class ActionsController {
  constructor(private readonly executeActionUseCase: ExecuteActionUseCase) {}

  @Post('execute')
  async executeAction(
    @Body() dto: ExecuteActionDto,
  ): Promise<ActionExecutionResult> {
    const result = await this.executeActionUseCase.execute(dto);

    return result;
  }
}
