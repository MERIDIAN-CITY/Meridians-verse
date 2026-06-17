import { Exclude } from 'class-transformer';
import { Post } from 'src/post/post.entity';
import { Tweet } from 'src/tweets/dto/tweet.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 100, nullable: false })
  firstName: string;

  @Column('varchar', { length: 100 })
  lastName: string;

  @Column('varchar', { unique: true, nullable: false })
  email: string;

  @Exclude()
  @Column('varchar', { nullable: false })
  password: string;

  // doing a one to many releatinship btw users entity and post entity
  @OneToMany(() => Post, (posts) => posts.author)
  posts: Post[];

  @OneToMany(() => Tweet, (tweet) => tweet.user)
  tweet: Tweet[];

  // @Column({ default: true })
  // isActive: boolean;

  //   @OneToMany(type => Photo, photo => photo.user)
  //   photos: Photo[];
}
