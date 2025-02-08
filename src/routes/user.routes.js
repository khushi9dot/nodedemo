import { Router } from 'express'
import { registerUser ,loginUser,logoutUser,refreshAccessToken,changePassword,updateUserAccount,updateUserAvatar,updateUserCoverImage,
        getCurrentUser,getUserChannelProfile,getWatchHistory,deleteUser} from '../controllers/user.controllers.js';
import {upload} from '../middlewares/multer.middlewares.js'
import {verifyJWT} from "../middlewares/auth.middlewares.js"

const router=Router();

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser)
router.route("/login").post(loginUser)

//secure route
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(verifyJWT,refreshAccessToken)

router.route("/get-user").get(verifyJWT,getCurrentUser)

router.route("/changepwd").post(verifyJWT,changePassword)
router.route("/updateuseraccouunt").patch(verifyJWT,updateUserAccount)
router.route("/updateavatar").patch(upload.single('avatar'),verifyJWT,updateUserAvatar)
router.route("/updateCoverImage").patch(verifyJWT,upload.single('coverImage'),updateUserCoverImage)

router.route("/channel/:username").get(verifyJWT,getUserChannelProfile)
router.route("/watchHistory").get(verifyJWT,getWatchHistory)

router.route("/delete/:username").delete(deleteUser)

export default router