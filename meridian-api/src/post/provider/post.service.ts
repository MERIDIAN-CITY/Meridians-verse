import { HttpException, HttpStatus, Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from '../post.entity';
import { Repository } from 'typeorm';
import { CreatePostDto } from '../dto/create-post.dto';
import { UserService } from 'src/users/providers/user.services';
import { TagsService } from 'src/tag/tags.service';
import { PatchPostDto } from '../dto/patch-post.dto';
import { GetPostsDto } from '../dto/get-posts.dto';
import { Pagination } from 'src/common/pagination/providers/pagination.provider';
import { Paginated } from 'src/common/pagination/interfaces/paginated.interface';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class PostsService {
  private postCacheKeys: Set<string> = new Set();

  constructor(
    @InjectRepository(Post) private postRepository: Repository<Post>,

    private readonly userService: UserService,

    private readonly tagService: TagsService,

    private readonly paginationService: Pagination,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  public async FindAllposts(postQuery: GetPostsDto): Promise<Paginated<Post>> {
    const cacheKey = `posts_page_${postQuery.page}_limit_${postQuery.limit}`;
    this.postCacheKeys.add(cacheKey);

    const cachedPosts = await this.cacheManager.get<Paginated<Post>>(cacheKey);

    if (cachedPosts) {
      return cachedPosts;
    }

    const post = await this.paginationService.paginatedQuery(
      {
        limit: postQuery.limit,
        page: postQuery.page,
      },
      this.postRepository,
    );

    await this.cacheManager.set(cacheKey, post, 180);
    return post;
  }

  /**
   * Soft-deletes a post (issue #427).
   * TypeORM automatically excludes rows with a non-null `deletedAt` from
   * subsequent `find*` calls. Use `restorePost` to undo this operation.
   */
  public async deleteOne(id: number) {
    await this.postRepository.softDelete(id);

    await this.invalidatePostCache();

    return { deleted: true, id };
  }

  /**
   * Restores a soft-deleted post, clearing its `deletedAt` value so it
   * reappears in regular queries.
   */
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
    //find author from databbase based on author ID i.e from postDTo
    const author = await this.userService.findOneId(createpostDto.authorId);

    // find tag from database
    const tags = await this.tagService.findMultiTag(createpostDto.tags);

    // /SECOND METHIOD very short line(64 & 74) AFTER puting cascade to "true" in post entity
    // for this method comment or remove the metaoption repository
    // the remove  [Metoption] from Post module we dont need it
    const post = this.postRepository.create({
      ...createpostDto,
      author,
      tags,
    });

    // return the post to the user
    const savedPost = await this.postRepository.save(post);
    await this.invalidatePostCache();
    return savedPost;
  }

  //TO EDIT A POST
  public async UpdatePost(patchPostDto: PatchPostDto) {
    //STEPS

    //find the tags
    const tags = await this.tagService.findMultiTag(patchPostDto.tags);

    // find the post
    const post = await this.postRepository.findOneBy({
      id: patchPostDto.id,
    });

    // update the properties
    post.title = patchPostDto.title ?? post.title;
    post.content = patchPostDto.content ?? post.content;
    post.imageUrl = patchPostDto.imageUrl ?? post.imageUrl;
    post.postType = patchPostDto.postType ?? post.postType;
    post.postStatus = patchPostDto.PostStatus ?? post.postStatus;

    //assign the new tags
    post.tags = tags;

    // save the post
    const updatedPost = await this.postRepository.save(post);
    await this.invalidatePostCache();
    return updatedPost;
  }

  private async invalidatePostCache() {
    const keys = Array.from(this.postCacheKeys);
    await Promise.all(keys.map((key) => this.cacheManager.del(key)));
    this.postCacheKeys.clear();
  }
}
