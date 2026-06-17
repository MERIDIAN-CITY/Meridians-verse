import { IsJSON, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostMetaOptionsDto {
  @CreateDateColumn()
  @ApiPropertyOptional({
    description: 'Creation timestamp',
    example: '2026-06-17T00:00:00.000Z',
  })
  createDate: Date;

  @UpdateDateColumn()
  @ApiPropertyOptional({
    description: 'Last update timestamp',
    example: '2026-06-17T00:00:00.000Z',
  })
  updatedatecolumn: Date;

  @IsNotEmpty()
  @IsJSON()
  @ApiProperty({
    description: 'Meta options key-value JSON string',
    example: '{"sidebarEnabled": true}',
  })
  metaValue: string;
}
