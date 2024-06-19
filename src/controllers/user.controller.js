import {asyncHandler} from "../utils/asyncHandler.js"
import ApiError from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"



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


   const {fullname, email, username, password} = req.body
//    console.log("email: ", email);
   
    if(
        [fullname, email, username, password].some((field) => field?.trim()==="")
    ){
        throw new ApiError(400, "all firlds are required")
    }


// for beginner   
//    if(fullname ===""){
//     throw new ApiError(400, "fullname is required")
//    }


    const existedUser = await User.findOne({
        $or: [{email}, {username}]
    })
    if(existedUser){
        throw new ApiError(409, "user alreadcoverImagey exists")
    }


    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullname,
        email,
        username : username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    const createUser =await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createUser){
        throw new ApiError(500, "user creation failed")
    }


    return res.status(201).json(
        new ApiResponse(200, "user created", createUser)
    )

} )

export {registerUser}