import { Module, forwardRef } from '@nestjs/common';
import { Pagination } from './pagination/Provider/pagination';

@Module({
  imports: [],
  providers: [Pagination],
  controllers: [],
  exports: [Pagination],
})
export class PaginationModule {}
