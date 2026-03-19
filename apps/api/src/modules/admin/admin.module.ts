import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Refugio, RefugioSchema } from '../refugios/schemas/refugio.schema';
import { Donacion, DonacionSchema } from '../donaciones/schemas/donacion.schema';
import { RefugiosRepository } from '../refugios/refugios.repository';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    JwtModule.register({}),
    BullModule.registerQueue({ name: 'email' }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Refugio.name, schema: RefugioSchema },
      { name: Donacion.name, schema: DonacionSchema },
    ]),
  ],
  providers: [RefugiosRepository, AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
