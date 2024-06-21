import {Router} from 'express';
import {loginUser, logoutUser, registerUser, refreshAccessToken} from '../controllers/user.controller.js';
import {upload} from "../middlerwares/multer.middlerware.js"
import {verifyJWT} from "../middlerwares/auth.middleware.js"


const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
    )

router.route("/login").post(loginUser)

// secured routes
router.route("/logout").post(verifyJWT  ,logoutUser)
route.route("/refresh-route").post(refreshAccessToken)

export default router;