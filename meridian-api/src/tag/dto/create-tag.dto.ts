import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({
    description: 'Tag name (will be normalized to lowercase)',
    example: 'DeFi',
  })
  @IsString()
  @MaxLength(256)
  name: string;

  @ApiProperty({
    description: 'Tag slug (will be generated from name)',
    example: 'defi',
  })
  @IsString()
  @MaxLength(512)
  slug: string;

  @ApiPropertyOptional({
    description: 'Tag description',
    example: 'Decentralized Finance topics',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'JSON schema for structured data',
    example: '{"type":"category"}',
  })
  @IsOptional()
  @IsString()
  schema?: string;

  @ApiPropertyOptional({
    description: 'Featured image URL',
    example: 'https://example.com/tag-image.jpg',
  })
  @IsOptional()
  @IsUrl()
  featuredImage?: string;
}
