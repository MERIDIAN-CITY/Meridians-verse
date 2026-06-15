import { User } from "src/users/user.entity";
import { User } from "src/users/user.entity";
import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn, Index } from "typeorm";

@Entity()
export class Tweet {
    @PrimaryGeneratedColumn()
    id: number          


    @Column( {
        type: "text",
         nullable:true
    })
    text:string

      @Column( {
        type: "text",
         nullable:true
    })
    image?: string


    @Index()
    @ManyToOne(() => User, (user) => user.tweet, )
    user:User

  

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

}