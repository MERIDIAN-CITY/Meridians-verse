import { Body, Inject, Injectable } from '@nestjs/common';
import { GetPostsParamDto } from '../dto/post-param.dto';
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
import { CACHE_MANAGER } from '@nestjs/cache-manager/dist/cache.constants';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private postRepository: Repository<Post>,

    private readonly userService: UserService,

    private readonly tagService: TagsService,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,

    private readonly paginationService: Pagination,
  ) { }

  public async FindAllposts(postQuery: GetPostsDto): Promise<Paginated<Post>> {
    const cacheKey = `posts:${postQuery.page}:${postQuery.limit}`;

    // Check if data is already in cache
    const cached = await this.cacheManager.get<Paginated<Post>>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database if cache is empty
    const result = await this.paginationService.paginatedQuery(
      {
        limit: postQuery.limit,
        page: postQuery.page,
      },
      this.postRepository,
    );

    // Store the result in cache for 60 seconds
    await this.cacheManager.set(cacheKey, result, 60);

    return result;
  }

  public async deleteOne(id: number) {
    //find the post you want to delete, find the metaoption of the post you want to delete
    await this.postRepository.delete(id);

    return { deleted: true, id };
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
    return await this.postRepository.save(post);
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
    return await this.postRepository.save(post);
  }
}
