import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {apiResponse} from "../utils/apiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefreshToken=async(userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})

        return{accessToken,refreshToken}

    } catch (error) {
        throw new apiError(500,"somethin went wrong while generate access and refresh token")
    }
}

const registerUser=asyncHandler(async (req, res)=>{
    // res.status(200).json({
    //     message:"ok"
    // })

    const {username,email,fullName,password}=req.body
    console.log("username:",username)

    if(fullName === ""){
        throw new apiError(400,"enter username:")  
    }
    else if(email === ""){
        throw new apiError(400,"enter email:")
    }
    else if(fullName === ""){
        throw new apiError(400,"enter full name:")
    }
    else if(password === ""){
        throw new apiError(400,"enter password:")
    }

    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser){
        throw new apiError(402,"this username or email already exists")
    }

    // file avatar and coverimage upload
    const avatarLocalPath=req.files?.avatar[0]?.path;
    const coverImageLocalPath=req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new apiError(402,"avatar is required")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath);
    const coverImage=await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new apiError(404,"avatar must be uploaded")
    }


    //create user object
    const user=await User.create({
        username:username.toLowerCase(),
        fullName,
        email,
        password,
        avatar:avatar.url,
        coverImage:coverImage?.url || ""
    })

    //* use user._id not User._id
    const createdUser=await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new apiError(500,"something went wrong while registering...")
    }


    //send response
    return res.status(200).json(
        new apiResponse(201,createdUser,"user register successfully")
    )


})

const loginUser=asyncHandler(async (req,res)=>{
    //get email ,pwd from body
    const {email,password}=req.body
    
    if(!email){
        throw new apiError(402,"email is required...")
    }

    const user=await User.findOne({email})

    if(!user){
        throw new apiError(404,"user not found")
    }

    //check password
    const isPasswordValid=await user.isCorrectPassword(password)

    if(!isPasswordValid){
        throw new apiError(404,"password is incorrect")
    }

    //token
    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)

    //find user
    const loggedInUser =await User.findById(user._id).select("-password -refreshToken")

    //cookies
    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new apiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "user loggedIn successfully"
        )
    )
    
})

const logoutUser=asyncHandler(async (req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                accessToken:undefined
            }
        },
        {
            new:true
        }
    )

    //clear cookies
    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new apiResponse(201,{},"logged out success"))

})

const refreshAccessToken=asyncHandler(async (req,res)=>{
    try {
        const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
    
        if(!incomingRefreshToken){
            throw new apiError(401,"unauthorized access")
        }
    
        const decodedRefreshToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user=await User.findById(decodedRefreshToken?._id)
    
        if(!user){
            throw new apiError(401,"invalid refresh token")
        }
    
        if(incomingRefreshToken !== user.refreshToken){
            throw new apiError(401,"refresh token is expired or used")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newrefreshToken}=await generateAccessAndRefreshToken(user._id)
    
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newrefreshToken,options)
        .json(
            new apiResponse(201,
                {accessToken,refreshToken:newrefreshToken}
            ),
            "refresh token is refreshed"
        )

    } catch (error) {
        throw new apiError(401,error?.message || "invalid refresh token")
    }

})

const changePassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body

    const user=await User.findById(req.user?._id)

    const isCorrectPassword=await user.isCorrectPassword(oldPassword)

    if(!isCorrectPassword){
        throw new apiError(401,"wrong old password")
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200)
    .json(new apiResponse(200,{},"password changed successfully"))

})

const getCurrentUser=asyncHandler(async (req,res)=>{
    return res.status(200)
    .json(new apiResponse(200,req.user,"current user fetch successfully"))
})

const updateUserAccount=asyncHandler(async (req,res)=>{
    const {fullName,email}=req.body

    if(!fullName || !email){
        throw new apiError(401,"fullname or email are required")
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {$set:{
            fullName:fullName,
            email:email
        }},
        {new:true}
    ).select("-password")
    
    return res.status(200)
    .json(new apiResponse(200,{},"data updated successfully"))
    
})

const updateUserAvatar=asyncHandler(async (req,res)=>{
    const avatarLocalPath=req.file?.path

    if(!avatarLocalPath){
        throw new apiError(401,"avtar file is required")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new apiError(401,"file not updated in cloudinary")
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {$set:{
            avatar:avatar.url
        }},
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(new apiResponse(200,user,"update avatar successfully"))

})

const updateUserCoverImage=asyncHandler(async (req,res)=>{
    const coverImageLoaclPath=req.file?.path

    if(!coverImageLoaclPath){
        throw new apiError(401,"cover image is required")
    }

    const coverImage=await uploadOnCloudinary(coverImageLoaclPath)

    if(!coverImage.url){
        throw new apiError(401,"cover image is not upload in cloudinary")
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {$set:{
            coverImage:coverImage.url
        }},
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(new apiResponse(200,user,"cover image updated successfully"))

})

const getUserChannelProfile=asyncHandler(async (req,res)=>{
    const {username}=req.params

    if(!username?.trim()){
        throw new apiError(401,"username is missing")
    }

    const channel=User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subsriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subsriptions",
                loacalFiels:"_id",
                foreignField:"subscriber",
                as:"subscribed"
            }
        },
        {
            $addFields:{
                subsriberCount:{
                    $size:"$subscribers"
                },
                subscribedCount:{
                    $size:"$subscribed"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                subsriberCount:1,
                subscribedCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1
            }
        }
    ])
    
    if(!channel?.length){
        throw new apiError(404,"channel not found")
    }

    return res.status(200)
    .json(new apiResponse(200,channel[0],"channel fetched successfully..."))
})

const getWatchHistory=asyncHandler(async (req,res)=>{
    const user=await User.aggregate([
        {
            $match:{
            _id:new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"WatchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }   
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
    .json(new apiResponse(200,user[0].watchHistory,"history fetched successfully..."))
})

const deleteUser=asyncHandler(async (req,res)=>{
    const {username}=req.params

    const user=await User.findOneAndDelete({username})

    if(!user){
        throw new apiError(404,"user not found")
    }

    return res.status(200)
    .json(new apiResponse(200,{},"deleted successfully"))

})

export {registerUser,
    loginUser,
    logoutUser, 
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateUserAccount,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    deleteUser
}

