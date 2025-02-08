import mongoose, { Types } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema=new mongoose.Schema(
    {
        videoFile:{
            Type:String,
            required:true
        },
        thumbnail:{
            Type:String,
            required:true
        },
        title:{
            Type:String,
            required:true
        },
        description:{
            Type:String,
            required:true
        },
        owner:{
            Type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        views:{
            Type:Number,
            required:true,
            default:0
        },
        duration:{
            Type:Number,
            required:true
        },
        isPublished:{
            Type:Boolean,
            default:true
        }
    },{
        timestamps:true
    }
)

videoSchema.plugin(mongooseAggregatePaginate)

export const Video=mongoose.model("Video",videoSchema)