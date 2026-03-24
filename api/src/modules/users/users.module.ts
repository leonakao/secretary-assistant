import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from './entities/user.entity';
import { UserCompany } from '../companies/entities/user-company.entity';
import { UsersMeController } from './controllers/users-me.controller';
import { GetUsersMeUseCase } from './use-cases/get-users-me.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserCompany]), AuthModule],
  controllers: [UsersMeController],
  providers: [GetUsersMeUseCase],
  exports: [TypeOrmModule],
})
export class UsersModule {}
