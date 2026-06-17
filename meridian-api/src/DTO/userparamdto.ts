import { IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// this was created because of the undefined in Param controller file
// it is use to transfrom the id
export class GetuserParamDto {
  @ApiPropertyOptional({
    description: 'Get user with a specific ID',
    example: 1234,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  id?: number;
}
