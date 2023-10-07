import express from 'express'
import { requireSignin } from '../middlware/index.js'
import { addLogin, deleteVaultLogin } from '../Controllers/loginController.js'

const router = express.Router()

router.post("/login/add-login", requireSignin, addLogin)
router.post("/login/remove-login", requireSignin, deleteVaultLogin)

export default router