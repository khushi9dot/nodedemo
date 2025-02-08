import mongoose from "mongoose";

const subscriptionSchema=new mongoose.Schema({
    subscriber:{
        type:mongoose.Schema.models.objectId,
        ref:"User"
    },
    channel:{
        type:mongoose.Schema.models.objectId,
        type:"User"
    }
    },{timestamps:true})

export const Subscription=mongoose.model("Subscription",subscriptionSchema)