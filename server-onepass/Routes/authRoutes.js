import express from 'express'
import { addData, signIn, signInRequest, signOut, tokenRefresh, userKeyGeneration, isLoggedIn, validateUserPassword } from '../Controllers/authController.js'
import { requireSignin } from "../middlware/index.js"

const router = express.Router()

router.post("/auth/isloggedin", isLoggedIn)
router.post("/auth/genKeys", userKeyGeneration)
router.post("/auth/add-user-data", addData)
router.post("/auth/signin-request", signInRequest)
router.post("/auth/signin", signIn)
router.post("/auth/token", tokenRefresh)
router.post("/auth/signout", signOut)
router.post("/auth/validate-user-pass", requireSignin, validateUserPassword) 

export default router