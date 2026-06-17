import {
  IsString,
  IsOptional,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
} from 'class-validator';
import { Column } from 'typeorm';

import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @Column()
  @IsString()
  @ApiProperty({ description: 'First name of the user', example: 'John' })
  firstName: string;

  @Column()
  @IsString()
  @ApiProperty({ description: 'Last name of the user', example: 'Doe' })
  lastName: string;

  @Column()
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
  })
  email: string;

  @Column()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Password of the user', example: 'Password123!' })
  password: string;
}
