import { IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// this was created because of the undefined in Param controller file
// it is use to transfrom the id to number
export class GetPostsParamDto {
  @ApiPropertyOptional({
    description: 'Get posts with a specific ID',
    example: 1234,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  id?: number;
}
