import { Body, Controller, Post } from '@nestjs/common';
import { MetaoptionService } from './metaoption.service';
import { CreatePostMetaOptionsDto } from 'src/DTO/createPostMetadto';

@Controller('meta-options')
export class MetaoptionController {
  constructor(private readonly metaService: MetaoptionService) {}

  @Post()
  public createMeta(createPostMetadto: CreatePostMetaOptionsDto) {
    return this.metaService.createMeta(createPostMetadto);
  }
}
