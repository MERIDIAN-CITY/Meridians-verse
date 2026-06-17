import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateUserDto } from 'src/DTO/create-user.dto';

export class CreateManyUsersDto {
  @ApiProperty({
    type: [CreateUserDto],
    required: true,
    description: 'Array of users to create',
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateUserDto)
  users: CreateUserDto[];
}

// validatrenested means for all validation in creteuserdto should also work for manyuserdto
