import {
  Body,
  Controller,
  Delete,
  Patch,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PostsService } from './provider/post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PatchPostDto } from './dto/patch-post.dto';
import { GetPostsDto } from './dto/get-posts.dto';
import { ApiEnvelopeResponse } from 'src/common/decorators/api-envelope-response.decorator';

@ApiTags('Posts')
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostsService) {}

  @Get('/:id?')
  @ApiOperation({
    summary: 'Fetch all posts with optional filtering and pagination',
  })
  @ApiEnvelopeResponse({
    dataExample: {
      data: [
        {
          id: 10,
          title: 'Hello',
          content: 'World',
        },
      ],
      meta: { total: 1, page: 1, limit: 10 },
    },
    description: 'Paginated posts retrieved successfully.',
  })
  public getPosts(@Query() getPostDto: GetPostsDto) {
    return this.postService.FindAllposts(getPostDto);
    console.log(getPostDto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiEnvelopeResponse({
    status: 201,
    dataExample: {
      id: 10,
      title: 'Hello',
      content: 'World',
    },
    description: 'Post created successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad request / Validation failure' })
  public Createpost(@Body() createpostdto: CreatePostDto) {
    // console.log(createpostdto instanceof CreatePostDto)
    return this.postService.createPost(createpostdto);
  }

  @Delete()
  @ApiOperation({ summary: 'Soft-delete a post (issue #427)' })
  @ApiEnvelopeResponse({
    dataExample: { deleted: true, id: 10 },
    description: 'Post soft-deleted successfully.',
  })
  public deleteOne(@Query('id', ParseIntPipe) id: number) {
    return this.postService.deleteOne(id);
  }

  @Post('/:id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted post by ID' })
  @ApiEnvelopeResponse({
    dataExample: { restored: true, id: 10 },
    description: 'Post restored successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found or not soft-deleted',
  })
  public restorePost(@Param('id', ParseIntPipe) id: number) {
    return this.postService.restorePost(id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update an existing post' })
  @ApiEnvelopeResponse({
    dataExample: {
      id: 10,
      title: 'New',
      content: 'New content',
      postStatus: 'review',
    },
    description: 'Post updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad request / Validation failure' })
  public updatePostTag(@Body() patchPostDto: PatchPostDto) {
    return this.postService.UpdatePost(patchPostDto);
  }
}
