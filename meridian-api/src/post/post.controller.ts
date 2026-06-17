import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Patch,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { PostsService } from './provider/post.service';
import { GetPostsParamDto } from 'src/DTO/postparamdto';
import { CreatePostDto } from 'src/DTO/create-post.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PatchPostDto } from 'src/DTO/patch-post.dto';
import { GetPostsDto } from 'src/DTO/getPostdto';

@ApiTags('Posts')
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostsService) {}

  @Get('/:id?')
  @ApiOperation({
    summary: 'Fetch all posts with optional filtering and pagination',
  })
  @ApiResponse({ status: 200, description: 'Successfully retrieved posts' })
  public getPosts(@Query() getPostDto: GetPostsDto) {
    return this.postService.FindAllposts(getPostDto);
    console.log(getPostDto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request / Validation failure' })
  public Createpost(@Body() createpostdto: CreatePostDto) {
    // console.log(createpostdto instanceof CreatePostDto)
    return this.postService.createPost(createpostdto);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete a post' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully' })
  public deleteOne(@Query('id', ParseIntPipe) id: number) {
    return this.postService.deleteOne(id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update an existing post' })
  @ApiResponse({ status: 200, description: 'Post updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request / Validation failure' })
  public updatePostTag(@Body() patchPostDto: PatchPostDto) {
    return this.postService.UpdatePost(patchPostDto);
  }
}
