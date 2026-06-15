import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Tweet } from "./dto/tweet.entity";
import { Repository } from "typeorm";
import { UserService } from "src/users/providers/user.services";
import { CreateTweetDto } from "./dto/create-tweet.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { UpdateTweetDto } from "./dto/update-tweet.dto";
import { ExceptionsHandler } from "@nestjs/core/exceptions/exceptions-handler";


@Injectable()
export class TweetService {
    constructor(
        @InjectRepository(Tweet)
        private tweetRepository: Repository<Tweet>,

        private readonly userService:UserService,


    ) {}


    async getAllTweet (userId:number) {

        let user = await this.userService.findOneById(userId)

        if (!user) {
            throw new NotFoundException(`User with ${userId} not found`)
           
        }

         console.log(user)

        return await this.tweetRepository.find({
            where: {user:{id:userId}},

        })

    }


    public async createTweet(createTweetDto:CreateTweetDto) {

        let User = await this.userService.findOneById(createTweetDto.userId)

        let Hashtags = []

      

        let tweet = await this.tweetRepository.create({
            ...createTweetDto,
            user:User,
    

        })
        return this.tweetRepository.save(tweet)   
    }


    public async updateTweet (updateTweetDto:UpdateTweetDto) {

        let tweet = await this.tweetRepository.findOneBy({
            id: updateTweetDto.id
        })

        tweet.text = updateTweetDto.text || tweet.text
        tweet.image = updateTweetDto.image
    
        return this.tweetRepository.save(tweet)
    }



    public async DeleteTweet (id:number) {
      await  this.tweetRepository.delete({
            id
        })

        return {deleted: true, id}
    }

}