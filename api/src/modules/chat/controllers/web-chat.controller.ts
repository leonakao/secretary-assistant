import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionGuard } from '../../auth/guards/session.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { UserCompany } from '../../companies/entities/user-company.entity';
import { MessageQueueService } from '../../message-queue/services/message-queue.service';
import { SendWebChatMessageDto } from '../dto/send-web-chat-message.dto';

@Controller('chat/messages')
export class WebChatController {
  constructor(
    @InjectRepository(UserCompany)
    private userCompanyRepository: Repository<UserCompany>,
    private messageQueueService: MessageQueueService,
  ) {}

  @Post()
  @UseGuards(SessionGuard)
  @HttpCode(202)
  async sendMessage(
    @CurrentUser() user: User,
    @Body() dto: SendWebChatMessageDto,
  ): Promise<{ status: 'pending'; userMessageId: string }> {
    // Verify that the user belongs to the specified company
    const userCompany = await this.userCompanyRepository.findOne({
      where: { userId: user.id, companyId: dto.companyId },
    });

    if (!userCompany) {
      throw new ForbiddenException('User does not have access to this company');
    }

    const conversationKey = `web_chat:${dto.companyId}:${user.id}`;
    const item = await this.messageQueueService.enqueueWebChat(
      dto.companyId,
      conversationKey,
      { userId: user.id, text: dto.message },
    );
    return { status: 'pending', userMessageId: item.id };
  }
}
