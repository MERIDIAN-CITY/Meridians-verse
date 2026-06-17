// import { Injectable, Inject } from '@nestjs/common';
// import { GetPostsDto } from 'src/common/Dto/GetPostBaseDto';
// import { PaginationQueryDto } from '../pagination-query.dto';
// import { ObjectLiteral, Repository } from 'typeorm';
// import { Request } from 'express';
// import { REQUEST } from '@nestjs/core';
// import { Paginated } from '../interface/paginationInterface';

// @Injectable()
// export class PaginationProvider {

//     constructor(
//         @Inject(REQUEST)
//         private readonly request: Request,
//     ) {}
//     public async paginationQuery <T extends ObjectLiteral>  (
//     paginationQueryDto: PaginationQueryDto,
//     repository: Repository<T>,
// ) :Promise <Paginated<T>> {
//     const  result = await repository.find({
//         //take is the number of post we want per page
//         skip:(paginationQueryDto.page - 1) * paginationQueryDto.limit,
//        take: paginationQueryDto.limit,
//       })

//       //create a request url
//       const baseUrl = this.request.protocol+ "://" + this.request.headers.host + "/";

//       const newUrl = new URL(this.request.url ,baseUrl)
//       console.log(newUrl);
//       console.log(baseUrl);

//       const totalItems = await repository.count()
//       const totalPages = Math.ceil(totalItems / paginationQueryDto.limit); // mathceil helps add another page when the data excceeds the limit

//       const nextPage =
//       paginationQueryDto === totalPages
//       ? paginationQueryDto.page
//        : paginationQueryDto.page + 1;

//       const previousPage =
//       paginationQueryDto.page === 1
//       ? paginationQueryDto.page
//       : paginationQueryDto.page - 1;

//       const finalRepsonse : Paginated<T> = {
//         data: result,
//         meta: {
//             itemsPerPage: paginationQueryDto.limit,
//             totalItems: totalItems,
//             currentPage: paginationQueryDto.page,
//             totalPage: totalPages,
//         },
//         links: {
//             first: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQueryDto.limit}&page=1`,

//              lastPage: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQueryDto.limit}&${totalPages}`,

//             current: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQueryDto.limit}&page=${paginationQueryDto.page}`,

//             next: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQueryDto.limit}&page=${nextPage}`,

//             previous: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQueryDto.limit}&page=${previousPage}`

//         }
//       }
//       return finalRepsonse;
// }
// }
