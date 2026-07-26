import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from '../post.entity';
import { DataSource, Repository } from 'typeorm';
import { CreatePostDto } from '../dto/create-post.dto';
import { UserService } from 'src/users/providers/user.services';
import { TagsService } from 'src/tag/tags.service';
import { PatchPostDto } from '../dto/patch-post.dto';
import { GetPostsDto } from '../dto/get-posts.dto';
import { Pagination } from 'src/common/pagination/providers/pagination.provider';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    @InjectRepository(Post) private postRepository: Repository<Post>,

    private readonly userService: UserService,

    private readonly tagService: TagsService,

    private readonly paginationService: Pagination,

    private readonly dataSource: DataSource,
  ) {}

  public async FindAllposts(
    postQuery: GetPostsDto,
  ): Promise<{ data: Post[]; nextCursor: number | null; total: number }> {
    const posts = await this.paginationService.paginatedCursorQuery(
      {
        limit: postQuery.limit,
        cursor: postQuery.cursor,
        startDate: postQuery.startDate,
        endDate: postQuery.endDate,
      },
      this.postRepository,
      ['tags', 'author', 'metaOptions'],
    );
    return posts;
  }

  public async deleteOne(id: number) {
    await this.postRepository.softDelete(id);

    return { deleted: true, id };
  }

  public async restorePost(id: number) {
    const result = await this.postRepository.restore(id);

    if (!result.affected) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: `Post with id ${id} was not found or is not soft-deleted`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return { restored: true, id };
  }

  public async createPost(createpostDto: CreatePostDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const author = await this.userService.findOneId(createpostDto.authorId);
      // FIX: Convert number[] to string[] if tags are numbers
      const tags = await this.tagService.findMultiTag(
        createpostDto.tags.map(String)
      );
      const post = queryRunner.manager.create(Post, {
        ...createpostDto,
        author,
        tags,
      });
      const saved = await queryRunner.manager.save(Post, post);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        'createPost transaction rolled back',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  public async UpdatePost(patchPostDto: PatchPostDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // FIX: Convert number[] to string[] if tags are numbers
      const tags = await this.tagService.findMultiTag(
        patchPostDto.tags.map(String)
      );
      const post = await queryRunner.manager.findOneBy(Post, {
        id: patchPostDto.id,
      });

      post.title = patchPostDto.title ?? post.title;
      post.content = patchPostDto.content ?? post.content;
      post.imageUrl = patchPostDto.imageUrl ?? post.imageUrl;
      post.postType = patchPostDto.postType ?? post.postType;
      post.postStatus = patchPostDto.PostStatus ?? post.postStatus;
      post.tags = tags;

      const saved = await queryRunner.manager.save(Post, post);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        'UpdatePost transaction rolled back',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
