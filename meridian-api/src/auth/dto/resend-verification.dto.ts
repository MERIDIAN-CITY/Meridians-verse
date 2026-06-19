import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Email address that should receive a new verification email',
    example: 'john.doe@example.com',
  })
  email: string;
}
