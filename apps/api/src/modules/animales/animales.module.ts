import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { Animal, AnimalSchema } from './schemas/animal.schema';
import { AnimalesRepository } from './animales.repository';
import { AnimalesService } from './animales.service';
import { AnimalesController } from './animales.controller';
import { Refugio, RefugioSchema } from '../refugios/schemas/refugio.schema';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: Animal.name, schema: AnimalSchema },
      { name: Refugio.name, schema: RefugioSchema },
    ]),
  ],
  providers: [AnimalesRepository, AnimalesService],
  controllers: [AnimalesController],
  exports: [AnimalesService, AnimalesRepository],
})
export class AnimalesModule {}
