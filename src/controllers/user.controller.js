import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"



const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findByIdAndUpdate(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }



    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens")
    }
}

const registerUser = asyncHandler( async (req,res) =>{
   // get user detail from frontend
   // validation  - not empty
   // check if user already exists : username or email
   // check for images, check for avatar
   // upload them to clouldinary, avatar 
   // create user object - create entry in db
   // remove password and refresh token field from response
   // check for user creation 
   // return response


   const {fullName, email, username, password } = req.body
//    console.log("email: ", email);
   
    if (
        [fullName, email, username, password].some((field) => 
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }


// for beginner   
//    if(fullname ===""){
//     throw new ApiError(400, "fullname is required")
//    }


    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }


    const avatarLocalPath = req.files?.avatar[0]?.path;
    // sconst coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath ;
    if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }



    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // if (!avatar) {
    //     throw new ApiError(400, "Avatar is not upload on cloundinary")
    // }

    const user = await User.create({
        fullName,
        avatar: avatar?.url || "",
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )

const loginUser = asyncHandler( async (req,res) =>{
  // req body -> data
  // username or email , password
  // find the user in db
  // password check
  // access and refresh token generation
  // send cookies 
  // send response success login

    const {email, username, password} = req.body
    console.log(username);


    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ email }, { username }]
    })

    if(!user){
        throw new ApiError(404, "User not found")
    }

    const isPasswordVaild = await user.isPasswordCorrect(password)

    if(!isPasswordVaild){
        throw new ApiError(401, "password is incorrect")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = User.findByIdAndUpdate(user._id).
    select ("-password -refreshToken")

    const options = {
        httpOnly: true,
        sameSite: "none",
        secure: true
    }

    
    return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(200, 
                {
                    user: loggedInUser,
                    accessToken, 
                    refreshToken
                },
                "User logged In Successfully"
            );



})

const logoutUser = asyncHandler( async (req,res) =>{
    // clear the cookies
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        sameSite: "none",
        secure: true
    }

    return res.
    status(200).
    clearCookie("accessToken", options).
    clearCookie("refreshToken", options).
    json(
        new ApiResponse(200, {}, "User logged out successfully")
    )



})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshAccessToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Refresh token is required")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id())
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newrefreshToken}= await generateAccessAndRefreshToken(user._id)
    
        return res
                .status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", newrefreshToken, options)
                .json(
                    new ApiResponse(
                        200, 
                        {accessToken, newrefreshToken}, 
                        "Token refreshed successfully")
                )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }


})

const changeCurrentPassword = asyncHandler(async (req, res)=>{
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(401, "Old password is incorrect")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
            .status(200)
            .json(
                new ApiResponse(200, {}, "Password changed successfully")
            )

})

const getCurrentUser = asyncHandler(async(req, res)=>{
    return res
    .status(200)
    .json(
        200,
        req.user,
        "User details fetched successfully"
    )
})

const updateAccountDetails = asyncHandler(async (req, res)=>{
    const {fullName, email} = req.body

    if(!fullName || !email){
        throw new ApiError(400, "all filed required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, user, "Account details updated successfully"
        )
    )
})

const updateUserAvatar = asyncHandler(async (req, res)=>{

    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar local file is required")
    }
     const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400, "Avatar is not uploaded on cloudinary")
    }

   const user =  await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },{
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, user, "Avatar updated successfully"
        )
    )

})

const updateUserCoverImage = asyncHandler(async (req, res)=>{

    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "coverImage local file is required")
    }
     const avatar = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400, "Avatar is not uploaded on cloudinary")
    }

   const user =  await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImge: converImage.url
            }
        },{
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, user, "coverImage updated successfully"
        )
    )

})

const getUserChannelProfile = asyncHandler (async (req,res)=>{
    const {username} = req.params
    if(!username?.trim()){
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match : {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields : {
                subscribersCount :{
                    $size : "$subscribers"
                },
                channelsSubscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond :{
                        if : {$in : [req.user?._id, "$subscribers.subscriber"]},
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project : {
                fullname : 1,
                username : 1,
                avatar : 1,
                coverImage : 1,
                subscribersCount : 1,
                channelsSubscribedToCount : 1,
                isSubscribed : 1
            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(404, "Channel not found")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(
            200, channel[0], "Channel profile fetched successfully"
        )
    )

})  

const getWatchHistory = asyncHandler(async (req, res)=>{

    const user = await User.aggregate([
        {
            $match : {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup : {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline :[
                    {
                        $lookup :{
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipline : [
                                {
                                    $project : {
                                        username : 1,
                                        avatar : 1,
                                        fullName : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, user[0]?.watchHistory, "Watch history fetched successfully"
        )
    )

}) 




export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}