import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Tag } from './tag.entity';
import { In, Repository } from 'typeorm';
import { CreateTagDto } from './dto/create-tag.dto';
import { GetTagsDto } from './dto/get-tags.dto';
import { Pagination } from 'src/common/pagination/providers/pagination.provider';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag) private readonly tagRepository: Repository<Tag>,
    private readonly paginationService: Pagination,
  ) {}

  public async findMultiTag(tags: string[]) {
    const result = this.tagRepository.find({
      where: { id: In(tags) },
    });
    return result;
  }

  public async findAll(
    getTagsDto: GetTagsDto,
  ): Promise<{ data: Tag[]; nextCursor: string | null; total: number }> {
    const tags = await this.paginationService.paginatedCursorQuery(
      {
        limit: getTagsDto.limit,
        cursor: getTagsDto.cursor ? parseInt(getTagsDto.cursor) : undefined,
        startDate: getTagsDto.startDate,
        endDate: getTagsDto.endDate,
      },
      this.tagRepository,
      ['post'],
    );
    return tags;
  }

  public async createTag(createTagDto: CreateTagDto) {
    const normalizedName = createTagDto.name.trim().toLowerCase();
    const normalizedSlug = createTagDto.slug.trim().toLowerCase();

    const existingTag = await this.tagRepository
      .createQueryBuilder('tag')
      .where('LOWER(tag.name) = :name', { name: normalizedName })
      .withDeleted()
      .getOne();

    if (existingTag) {
      if (existingTag.deletedAt) {
        await this.tagRepository.restore(existingTag.id);
        existingTag.slug = normalizedSlug;
        existingTag.description = createTagDto.description || existingTag.description;
        existingTag.schema = createTagDto.schema || existingTag.schema;
        existingTag.featuredImage = createTagDto.featuredImage || existingTag.featuredImage;
        return await this.tagRepository.save(existingTag);
      }
      
      return existingTag;
    }

    const tag = this.tagRepository.create({
      ...createTagDto,
      name: normalizedName,
      slug: normalizedSlug,
    });

    return await this.tagRepository.save(tag);
  }

  public async deleteTag(id: string) {
    const tag = await this.tagRepository.findOneBy({ id });
    if (!tag) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: `Tag with id ${id} not found`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.tagRepository.softDelete(id);
    return { deleted: true, id };
  }

  public async restoreTag(id: string) {
    const result = await this.tagRepository.restore(id);

    if (!result.affected) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: `Tag with id ${id} was not found or is not soft-deleted`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return { restored: true, id };
  }
}
