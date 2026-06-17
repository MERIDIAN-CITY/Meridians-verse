import { IsEmail, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// using the patch to edit part of the data, the partialtype makes everything optional
export class EditUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ description: 'The ID of the user to edit', example: 1 })
  @IsInt()
  @IsNotEmpty()
  id: number;
}
