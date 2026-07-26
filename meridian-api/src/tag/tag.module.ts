import { Module } from '@nestjs/common';
import { TagController } from './tag.controller';
import { TagsService } from './tags.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag } from './tag.entity';
import { PaginationModule } from 'src/common/pagination/pagination.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tag]),
    PaginationModule,
  ],
  controllers: [TagController],
  providers: [TagsService],
  exports: [TypeOrmModule, TagsService],
})
export class TagModule {}
