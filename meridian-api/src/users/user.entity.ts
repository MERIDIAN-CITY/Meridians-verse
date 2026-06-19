import { Exclude } from 'class-transformer';
import { Post } from 'src/post/post.entity';
import { Tweet } from 'src/tweets/entities/tweet.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
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

  // Email verification columns.
  // `emailVerified` defaults to `true` so existing accounts created before the
  // email verification feature shipped are NOT automatically locked out when
  // TypeORM alters the table to add the column. New users created via
  // CreateUserProvider explicitly set this to `false` so they still need to
  // verify before signing in.
  @Column({ default: true })
  emailVerified: boolean;

  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  verificationToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  verificationTokenExpires: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Soft-delete column added by upstream (#427); preserved so admins can
  // restore deleted accounts without losing the new verification state.
  @DeleteDateColumn()
  deletedAt: Date | null;

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
