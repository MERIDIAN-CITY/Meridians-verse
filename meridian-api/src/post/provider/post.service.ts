import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Post } from '../post.entity';
import { GetPostsDto } from '../dto/get-posts.dto';
import { CreatePostDto } from '../dto/create-post.dto';
import { PatchPostDto } from '../dto/patch-post.dto';

import { UserService } from 'src/users/providers/user.services';
import { TagsService } from 'src/tag/tags.service';

import { Pagination } from 'src/common/pagination/providers/pagination.provider';
import { Paginated } from 'src/common/pagination/interfaces/paginated.interface';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,

    private readonly userService: UserService,
    private readonly tagService: TagsService,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,

    private readonly paginationService: Pagination,
  ) {}

  // =========================
  // GET ALL POSTS (WITH CACHE)
  // =========================
  public async FindAllposts(
    postQuery: GetPostsDto,
  ): Promise<Paginated<Post>> {
    const cacheKey = `posts:${postQuery.page}:${postQuery.limit}`;

    const cached = await this.cacheManager.get<Paginated<Post>>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.paginationService.paginatedQuery(
      {
        limit: postQuery.limit,
        page: postQuery.page,
      },
      this.postRepository,
    );

    await this.cacheManager.set(cacheKey, result, { ttl: 60 });

    return result;
  }

  // =========================
  // DELETE POST (CACHE INVALIDATION)
  // =========================
  public async deleteOne(id: number) {
    await this.postRepository.delete(id);

    await this.clearPostCache();

    return { deleted: true, id };
  }

  // =========================
  // CREATE POST (CACHE INVALIDATION)
  // =========================
  public async createPost(createpostDto: CreatePostDto) {
    const author = await this.userService.findOneId(createpostDto.authorId);
    const tags = await this.tagService.findMultiTag(createpostDto.tags);

    const post = this.postRepository.create({
      ...createpostDto,
      author,
      tags,
    });

    const saved = await this.postRepository.save(post);

    await this.clearPostCache();

    return saved;
  }

  // =========================
  // UPDATE POST (CACHE INVALIDATION)
  // =========================
  public async UpdatePost(patchPostDto: PatchPostDto) {
    const tags = await this.tagService.findMultiTag(patchPostDto.tags);

    const post = await this.postRepository.findOneBy({
      id: patchPostDto.id,
    });

    if (!post) {
      throw new Error('Post not found');
    }

    post.title = patchPostDto.title ?? post.title;
    post.content = patchPostDto.content ?? post.content;
    post.imageUrl = patchPostDto.imageUrl ?? post.imageUrl;
    post.postType = patchPostDto.postType ?? post.postType;
    post.postStatus = patchPostDto.PostStatus ?? post.postStatus;

    post.tags = tags;

    const updated = await this.postRepository.save(post);

    await this.clearPostCache();

    return updated;
  }

  // =========================
  // CACHE INVALIDATION HELPER
  // =========================
  private async clearPostCache() {
    // cache-manager v7 has no "del all by prefix"
    // so we manually clear known pagination ranges (simple strategy)

    const limits = [10, 20, 50];
    const pages = [1, 2, 3, 4, 5];

    const deletePromises: Promise<any>[] = [];

    for (const page of pages) {
      for (const limit of limits) {
        const key = `posts:${page}:${limit}`;
        deletePromises.push(this.cacheManager.del(key));
      }
    }

    await Promise.allSettled(deletePromises);
  }
}
