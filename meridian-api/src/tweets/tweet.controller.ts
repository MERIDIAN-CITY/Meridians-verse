import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { TweetService } from './tweet.service';
import { CreateTweetDto } from './dto/create-tweet.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiEnvelopeResponse } from 'src/common/decorators/api-envelope-response.decorator';

@ApiTags('Tweets')
@Controller('tweets')
export class TweetController {
  constructor(private readonly tweetService: TweetService) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Retrieve all tweets of a specific user' })
  @ApiEnvelopeResponse({
    dataExample: [
      { id: 1, userId: 1, content: 'Hello, world!' },
      { id: 2, userId: 1, content: 'Second tweet' },
    ],
    description: 'Tweets retrieved successfully.',
  })
  public getAllTweet(@Param('userId', ParseIntPipe) userId: number) {
    return this.tweetService.getAllTweet(userId);
  }

  @Post('create-tweet')
  @ApiOperation({ summary: 'Create a new tweet for a user' })
  @ApiEnvelopeResponse({
    status: 201,
    dataExample: { id: 1, userId: 1, content: 'Hello, world!' },
    description: 'Tweet created successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad request / Validation failure' })
  public createTweet(@Body() createTweetdto: CreateTweetDto) {
    return this.tweetService.createTweet(createTweetdto);
  }

  @Patch('update-tweet')
  @ApiOperation({ summary: 'Update an existing tweet' })
  @ApiEnvelopeResponse({
    dataExample: { id: 1, userId: 1, content: 'Updated content' },
    description: 'Tweet updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad request / Validation failure' })
  public updateTweet(@Body() updateTweetDto) {
    return this.tweetService.updateTweet(updateTweetDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a specific tweet by ID' })
  @ApiEnvelopeResponse({
    dataExample: { deleted: true, id: 1 },
    description: 'Tweet deleted successfully.',
  })
  public DeleteTweet(@Param('id', ParseIntPipe) id: number) {
    return this.tweetService.DeleteTweet(id);
  }
}
