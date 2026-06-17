import { IntersectionType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDate, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/commom/pagination/pagination-query.dto';

class GetPostsBaseDto {
  @ApiPropertyOptional({
    description: 'Filter posts created on or after this date',
    example: '2026-06-17T00:00:00.000Z',
  })
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter posts created on or before this date',
    example: '2026-06-17T23:59:59.000Z',
  })
  @IsDate()
  @IsOptional()
  endDate?: Date;
}

export class GetPostsDto extends IntersectionType(
  GetPostsBaseDto,
  PaginationQueryDto,
) {}

// actual dto we want to sent on line 21 and 22
// intersection used to add both of their contents together
