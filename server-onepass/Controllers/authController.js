import jwt from 'jsonwebtoken'
import { addUserData, addUserKeys, getMasterEncKey, getPrivateKey, getPublicKey, getUser, getUserHashPass, getUserHashPassAlt, removeUser } from './contractController.js';
import CryptoJS from 'crypto-js'
import sh from 'shortid'
import dotenv from 'dotenv'
import fs from 'fs'
dotenv.config()

import { webSessionList } from './webSessionController.js'
import { decryptAES, encryptAES } from './encryptController.js';

export let tokenlist = {}
let privateKey = undefined
let publicKey = undefined

try {
    privateKey = fs.readFileSync('ecdsaPrivKey.pem', 'utf-8')
    publicKey = fs.readFileSync('ecdsaPubKey.pem', 'utf-8')
} catch (error) {
    console.log(error)
}

// User SignUp Functions
export const userKeyGeneration = async (req, res) => {
    try {
        const user = {
            'email': req.body.email,
            'encPrivateKey': req.body.encPrivateKey,
            'encPublicKey': req.body.encPublicKey,
            'masterEncKey': req.body.masterEncKey,
            'hashPass': req.body.hashPass,
            'hashPassAlt': req.body.hashPassAlt
        }
        const chkUser = await getUser(user.email)
        if (chkUser[0] !== user.email) {
            const result = await addUserKeys(user)
            if (result.receipt.confirmations !== 0) {
                res.status(201).json({
                    message: 'User Key Generation Success',
                    serverPubKey: req.body.serverPubKey
                })
            }
            else if (result === false) {
                res.status(500).json({
                    message: 'Something went wrong...'
                })
            }
            else {
                res.status(500).json({
                    message: 'User Key Generation Unsuccessful'
                })
            }
        }
        else {
            res.status(401).json({
                message: 'User Already Registerd'
            })
        }

    } catch (error) {
        console.log(error)
        const result = await removeUser(req.body.email, "")
        if (result.receipt.confirmations !== 0) {
            res.status(500).json({
                message: 'Something went wrong... Please try again',
                error: error
            })
        }
        else {
            res.status(500).json({
                message: 'Something went wrong... Please try again',
                error: error
            })
        }
    }
}

export const addData = async (req, res) => {
    try {
        const user = {
            'email': req.body.email,
            'firstName': req.body.firstName,
            'lastName': req.body.lastName,
            'contact': req.body.contact,
            'passwordHash': req.body.passwordHash,
        }
        const chkUser = await getUser(user.email)
        if (chkUser[0] === user.email) {
            const result = await addUserData(user)
            if (result.receipt.confirmations !== 0) {
                res.status(201).json({
                    message: "User Data Added",
                    serverPubKey: req.body.serverPubKey
                })
            }
            else if (result === "You are not the owner of the object") {
                res.status(401).json({
                    message: 'Unauthorized'
                })
            }
            else if (result === "Invalid Password") {
                res.status(401).json({
                    message: 'Unauthorized'
                })
            }
            else if (result === false) {
                res.status(500).json({
                    message: 'Something went wrong...'
                })
            }
            else {
                res.status(500).json({
                    message: 'User Data Add Failed',
                    error: result
                })
            }
        }
        else {
            res.status(404).json({
                message: 'User Not Found'
            })
        }

    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: 'Something went wrong...',
            error: error
        })
    }
}

// User SignIn Functions
export const signInRequest = async (req, res) => {
    try {
        const sessionId = req.body.webSessionId
        const email = req.body.email
        const chkUser = await getUser(email)
        if (chkUser[0] === email) {
            const hashPass = await getUserHashPass(email)
            if (hashPass) {
                res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: "none", path: `/${sessionId}/*` })
                res.clearCookie('encToken', { httpOnly: true, secure: true, sameSite: "none", path: `/${sessionId}/*` })
                res.clearCookie('encVaultUnlockToken', { httpOnly: true, secure: true, sameSite: "none", path: `/${sessionId}/*` })
                res.clearCookie('addVaultUserToken', { httpOnly: true, secure: true, sameSite: "none", path: `/${sessionId}/*` })
                const payload = {
                    'hashPass': hashPass
                }
                const encodedPayload = JSON.stringify(payload)
                const encPayload = await encryptAES(encodedPayload, req.body.newServerAESKey)

                res.status(200).json({
                    message: "User Hash Fetch Success",
                    payload: encPayload,
                    serverPubKey: req.body.serverPubKey
                })
            }
            else if (hashPass === "User Not Found") {
                res.status(404).json({
                    message: 'User Not Found...'
                })
            }
            else if (result === false) {
                res.status(500).json({
                    message: 'Something went wrong...'
                })
            }
        }
        else {
            res.status(404).json({
                message: 'User Not Found'
            })
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: 'Something went wrong...',
            error: error
        })
    }
}

export const signIn = async (req, res) => {
    try {
        let thirtyMins = new Date()
        thirtyMins.setTime(thirtyMins.getTime() + (1 / 2 * 60 * 60 * 1000))
        let hours1 = new Date()
        hours1.setTime(hours1.getTime() + (1 * 60 * 60 * 1000))
        const user = req.body
        const IP = req.headers['x-forwarded-for']
        const userResult = await getUser(user.hashEmail)
        if (userResult[0] !== user.hashEmail) {
            res.status(404).json({
                message: "User not found"
            })
        }
        else if (userResult[0] === user.hashEmail) {
            const hashPass = await getUserHashPass(user.hashEmail)
            if (hashPass === user.hashPass) {
                const hashPassAlt = await getUserHashPassAlt(user.hashEmail)
                if (hashPassAlt === user.hashPassAlt) {
                    const encPrivate = await getPrivateKey(user.hashEmail, hashPass)
                    const encMasterKey = await getMasterEncKey(user.hashEmail, hashPass)
                    const publicKey = await getPublicKey(user.hashEmail)
                    if (
                        encPrivate !== false &&
                        encMasterKey !== false &&
                        publicKey !== false &&
                        encPrivate !== "Invalid Password" &&
                        encMasterKey !== "Invalid Password" &&
                        encPrivate !== "User Not Found" &&
                        encMasterKey !== "User Not Found" &&
                        publicKey !== "User Not Found"
                    ) {
                        const sessionId = req.body.webSessionId
                        const token = jwt.sign({ email: user.hashEmail, ip: IP, hashPass: hashPass }, privateKey, { algorithm: 'ES512', expiresIn: '30m' })
                        const tokenHash = CryptoJS.SHA256(token).toString()
                        const refreshToken = jwt.sign({ tokenHash: tokenHash }, privateKey, { algorithm: 'ES512', expiresIn: '1h' })
                        const encToken = await encryptAES(token, process.env.AES_SECRET)
                        tokenlist[refreshToken] = {
                            'webSessionId': req.body.webSessionId,
                            'refreshToken': refreshToken,
                            'hashPass': hashPass,
                            'tokenHash': tokenHash,
                            'ip': IP
                        }
                        webSessionList[req.body.webSessionId]['userSession'] = tokenHash
                        res.cookie('refreshToken', refreshToken, {
                            path: `/`,
                            expires: hours1,
                            sameSite: "none",
                            secure: true,
                            httpOnly: true
                        })
                        res.cookie('encToken', encToken, {
                            path: `/`,
                            expires: thirtyMins,
                            sameSite: "none",
                            secure: true,
                            httpOnly: true
                        })
                        const payload = {
                            user: {
                                email: userResult[0],
                                firstName: userResult[1],
                                lastName: userResult[2],
                                contact: userResult[3],
                                masterKey: encMasterKey,
                                privateKey: encPrivate,
                                publicKey: publicKey
                            }
                        }
                        const encodedPayload = JSON.stringify(payload)
                        const encPayload = await encryptAES(encodedPayload, req.body.newServerAESKey)
                        console.log(tokenlist, "New Signin")
                        res.status(200).json({
                            message: "Authentication successful",
                            payload: encPayload,
                            serverPubKey: req.body.serverPubKey
                        })
                    }
                    else {
                        res.status(401).json({
                            message: "Unauthorized"
                        })
                    }
                }
                else {
                    res.status(401).json({
                        message: 'Authentication Failed'
                    })
                }
            }
            else {
                res.status(401).json({
                    message: 'Authentication Failed'
                })
            }
        }
    }
    catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something Went Wrong!",
            error: error
        })
    }
}

export const isLoggedIn = async (req, res) => {
    try {
        if (req.cookies.sessionId) {
            const webSessionCookie = jwt.verify((await decryptAES(req.cookies.sessionId, process.env.AES_SECRET)), publicKey, { algorithms: ['ES512'] })
            const sessionId = webSessionCookie.sessionId
            const webSessions = Object.values(webSessionList)
            const webSession = webSessions.find(webSession => webSession.sessionID === sessionId)
            if (webSession) {
                if (req.cookies.encToken) {
                    const tokens = Object.values(tokenlist)
                    const encToken = req.cookies.encToken
                    const token = await decryptAES(encToken, process.env.AES_SECRET)
                    const tokenHash = CryptoJS.SHA256(token).toString()
                    if (tokenHash === webSession.userSession) {
                        const authToken = tokens.find(authToken => authToken.tokenHash === tokenHash)
                        if (authToken) {
                            const user = jwt.verify(token, publicKey, { algorithms: ['ES512'] })
                            if (user) {

                                if (user.ip !== req.headers['x-forwarded-for'] && user.ip !== authToken.ip) {
                                    return res.status(400).json({
                                        message: "Invalid Session"
                                    })
                                }
                                else if (user.email !== req.body.email) {
                                    return res.status(400).json({
                                        message: "Invalid Session"
                                    })
                                }
                                else {
                                    res.status(200).json({
                                        message: "Logged In"
                                    })
                                }
                            }
                            else {
                                return res.status(400).json({
                                    message: "Invalid Token"
                                })
                            }
                        }
                        else {
                            res.status(400).json({
                                message: "Session Expired"
                            })
                        }
                    }
                    else {
                        res.status(401).json({
                            message: "User and Web sessions mismatch"
                        })
                    }
                }
                else {
                    res.status(400).json({
                        message: "Not Logged In"
                    })
                }
            }
            else {
                res.status(401).json({
                    messasge: "Invalid Web Session"
                })
            }
        }
        else {
            res.status(401).json({
                message: "Web Session Token Not Found"
            })
        }
    }
    catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something Went Wrong",
            payload: error
        })
    }
}

export const tokenRefresh = async (req, res) => {
    try {
        let thirtyMins = new Date()
        thirtyMins.setTime(thirtyMins.getTime() + (1 / 2 * 60 * 60 * 1000))
        let hours1 = new Date()
        hours1.setTime(hours1.getTime() + (1 * 60 * 60 * 1000))
        let refreshToken = req.cookies.refreshToken
        let encToken = req.cookies.encToken
        let token = await decryptAES(encToken, process.env.AES_SECRET)
        if (token) {
            const decodedToken = jwt.verify(token, publicKey, { algorithms: ['ES512'] })
            let tokenHash = CryptoJS.SHA256(token).toString()
            let email = req.body.email
            let ip = req.headers['x-forwarded-for']
            if (Object.keys(tokenlist).length > 0 && tokenlist.constructor === Object) {
                if (tokenlist[refreshToken].ip === ip) {
                    const decodedRefresh = jwt.verify(refreshToken, publicKey, { algorithms: ['ES512'] })
                    if (tokenHash === tokenlist[refreshToken].tokenHash && decodedRefresh.tokenHash === tokenlist[refreshToken].tokenHash) {
                        if (((decodedToken.exp * 1000) - Date.now()) < (10 * 60 * 1000)) {
                            try {
                                delete tokenlist[refreshToken]
                                token = jwt.sign({ email: email, ip: ip, hashPass: decodedToken.hashPass }, privateKey, { algorithm: 'ES512', expiresIn: '30m' })
                                tokenHash = CryptoJS.SHA256(token).toString()
                                refreshToken = jwt.sign({ tokenHash: tokenHash }, privateKey, { algorithm: 'ES512', expiresIn: '1h' })
                                encToken = await encryptAES(token, process.env.AES_SECRET)
                                res.cookie('refreshToken', refreshToken, {
                                    path: `/`,
                                    expires: hours1,
                                    sameSite: "none",
                                    secure: true,
                                    httpOnly: true
                                })
                                res.cookie('encToken', encToken, {
                                    path: `/`,
                                    expires: thirtyMins,
                                    sameSite: "none",
                                    secure: true,
                                    httpOnly: true
                                })

                                tokenlist[refreshToken] = {
                                    'refreshToken': refreshToken,
                                    'hashPass': decodedToken.hashPass,
                                    'tokenHash': tokenHash,
                                    'ip': ip
                                }
                                console.log(tokenlist, "New TokenRefresh")
                                res.status(200).json({
                                    message: "Session Extended",
                                    serverPubKey: req.body.serverPubKey
                                })
                            }
                            catch (error) {
                                console.log(error)
                            }
                        }
                        else {
                            res.status(200).json({
                                message: "Session Valid",
                                serverPubKey: req.body.serverPubKey
                            })
                        }
                    }
                    else {
                        res.status(401).json({
                            message: "Invalid Token"
                        })
                    }
                }
                else {
                    res.status(401).json({
                        message: "Invalid Session"
                    })
                }
            }
            else {
                res.status(401).json({
                    message: "Session Expired"
                })
            }
        }
        else {
            res.status(400).json({
                message: "Invalid Token"
            })
        }
    }
    catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something Went Wrong!",
            error: error
        })
    }
}

export const signOut = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken
        delete tokenlist[refreshToken]
        try {
            const sessionToken = jwt.verify(await decryptAES(req.cookies.sessionId, process.env.AES_SECRET), publicKey, { algorithms: ['ES512'] })
            delete webSessionList[sessionToken.sessionId]
        } catch (error) {
            console.log(error)
        }

        console.log(tokenlist, "SignOut")

        res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: "none", path: `/` })
        res.clearCookie('encToken', { httpOnly: true, secure: true, sameSite: "none", path: `/` })
        res.clearCookie('encVaultUnlockToken', { httpOnly: true, secure: true, sameSite: "none", path: `/` })
        res.clearCookie('addVaultUserToken', { httpOnly: true, secure: true, sameSite: "none", path: `/` })
        res.status(200).json({
            message: "Signout successfully :)"
        })

    }
    catch (error) {
        console.log(error)
        res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: "none", path: `/` })
        res.clearCookie('encToken', { httpOnly: true, secure: true, sameSite: "none", path: `/` })
        res.clearCookie('encVaultUnlockToken', { httpOnly: true, secure: true, sameSite: "none", path: `/` })
        res.clearCookie('addVaultUserToken', { httpOnly: true, secure: true, sameSite: "none", path: `/` })
        res.status(200).json({
            message: "Something Went Wrong!",
            error: error
        })
    }

}

function clearTokenList() {
    try {
        const tokenObjArray = Object.values(tokenlist)
        for (let tokenObj of tokenObjArray) {
            const decodedRefreshToken = jwt.decode(tokenObj.refreshToken)
            if (Date.now() >= decodedRefreshToken.exp * 1000) {
                delete tokenlist[tokenObj.refreshToken]
            }
        }
        console.log("Expired auth tokens cleared", tokenlist)
    } catch (error) {
        console.log(error)
    }

}

setInterval(clearTokenList, 300000)