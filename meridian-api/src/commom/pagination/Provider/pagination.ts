import { Inject, Injectable } from '@nestjs/common';
import { PaginationQueryDto } from '../pagination-query.dto';
import { ObjectLiteral, Repository } from 'typeorm';
import { Request } from 'express';
import { REQUEST } from '@nestjs/core';
import { Paginated } from '../Interfaces/paginatedInterface';

@Injectable()
export class Pagination {
  constructor(
    @Inject(REQUEST)
    private readonly request: Request,
  ) {}

  public async paginatedQuery<T extends ObjectLiteral>(
    paginationQueryDto: PaginationQueryDto,
    repository: Repository<T>,
  ): Promise<Paginated<T>> {
    const result = await repository.find({
      //skip: number of post
      //take: number of post to show per page
      skip: paginationQueryDto.limit * (paginationQueryDto.page - 1),
      take: paginationQueryDto.limit,
    });

    // create a requestUrl
    // i.e http://localhost:3000/resource
    // the http is this.requestprotocol
    const baseUrl = this.request.protocol;
    +'://' + this.request.headers.host + '/';

    const newUrl = new URL(this.request.url, baseUrl);

    console.log(baseUrl);
    // line 34 give u http://localhost:3000/resource  as result on your terminal
    console.log(newUrl);

    const totalItems = await repository.count();

    const totalpage = Math.ceil(totalItems / paginationQueryDto.limit);

    const nextpage =
      paginationQueryDto.page === 1
        ? paginationQueryDto.page
        : paginationQueryDto.page + 1;

    const prevpage =
      paginationQueryDto.page === 1
        ? paginationQueryDto.page
        : paginationQueryDto.page - 1;

    const finalResponse: Paginated<T> = {
      data: result,
      meta: {
        itemsPerPage: paginationQueryDto.limit,
        totalItems: totalItems,
        currentPage: paginationQueryDto.page,
        totalPage: totalpage,
      },
      link: {
        first: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQueryDto.limit}&page=1`,

        last: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQueryDto.limit}&${totalpage}`,

        current: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQueryDto.limit}&page=${paginationQueryDto.page}`,

        next: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQueryDto.limit}&page=${nextpage}`,

        previous: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQueryDto.limit}&page=${prevpage}`,
      },
    };

    return finalResponse;
  }
}
