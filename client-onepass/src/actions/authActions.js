import { toast } from "react-hot-toast"
import axiosInstance from "../helpers/axios.js"
import { authConsts } from "./constants.js"
import { decryptAES, decryptRSA, importRSAPrivKey, generateHighEntropyKey, genRSAKeyPair, encryptAES, encryptRSA } from "../helpers/encrypt.js"
import { decryptRequest, encryptRequest } from "./webSessionActions.js"
import CryptoJS from "crypto-js"
import { keyExchange } from "./webSessionActions.js"

export const genKeys = (password, email) => {
    return async dispatch => {
        dispatch({
            type: authConsts.KEY_GEN_REQUEST
        })

        const derivedHighEntropyPassword = await generateHighEntropyKey(password)
        const { privExpB64, pubExpB64, keyPair } = await genRSAKeyPair()
        const encPrivate = await encryptAES(privExpB64, derivedHighEntropyPassword)

        const masterEncryptionKey = await generateHighEntropyKey(derivedHighEntropyPassword, true)
        const encryptedMasterEncKey = await encryptRSA(masterEncryptionKey, keyPair.publicKey)

        const hashPassword = CryptoJS.SHA512(derivedHighEntropyPassword).toString(CryptoJS.enc.Base64)
        const hashPasswordAlt = CryptoJS.SHA256(derivedHighEntropyPassword).toString(CryptoJS.enc.Base64)

        const form = {
            'email': email,
            'encPrivateKey': encPrivate,
            'encPublicKey': pubExpB64,
            'masterEncKey': encryptedMasterEncKey,
            'hashPass': hashPassword,
            'hashPassAlt': hashPasswordAlt
        }

        const webAESKey = sessionStorage.getItem('requestEncKey')
        const { encForm, privateKey } = await encryptRequest(form, webAESKey)
        const res = await axiosInstance.post("/auth/genkeys", { 'encData': encForm })

        if (res.status === 201) {
            const decData = await decryptRequest(res.data.payload || undefined, res.data.serverPubKey, privateKey, webAESKey)
            if (decData !== false) {
                toast.success("Key Generation Success")
                dispatch({
                    type: authConsts.KEY_GEN_SUCCESS
                })
                const result = {
                    status: true,
                    derivedHighEntropyPassword,
                    masterEncryptionKey,
                    hashPassword,
                    hashPasswordAlt
                }
                return result
            }
            else {
                toast.error("Something Went Wrong")
                dispatch(keyExchange())
                dispatch({
                    type: authConsts.KEY_GEN_FAILED
                })
                return false
            }
        }
        else if (res.response) {
            toast.error(res.response.data.message)
            dispatch(keyExchange())
            dispatch({
                type: authConsts.KEY_GEN_FAILED
            })
            return false
        }
    }
}

export const addData = (form, masterEncKey) => {
    return async dispatch => {
        dispatch({
            type: authConsts.USER_DATA_ADD_REQUEST
        })
        const encFirstName = await encryptAES(form.firstName, masterEncKey)
        const encLastName = await encryptAES(form.lastName, masterEncKey)
        const encContact = await encryptAES(form.contact, masterEncKey)

        const form1 = {
            'email': form.email,
            'firstName': encFirstName,
            'lastName': encLastName,
            'contact': encContact,
            'passwordHash': form.passwordHash,
        }

        const webAESKey = sessionStorage.getItem('requestEncKey')
        const { encForm, privateKey } = await encryptRequest(form1, webAESKey)
        const res = await axiosInstance.post("/auth/add-user-data", { 'encData': encForm })
        if (res.status === 201) {
            const decData = await decryptRequest(res.data.payload || undefined, res.data.serverPubKey, privateKey, webAESKey)
            if (decData !== false) {
                toast.success("Registered")
                dispatch({
                    type: authConsts.USER_DATA_ADD_SUCCESS
                })
                return true
            }
            else {
                toast.error("Something Went Wrong")
                dispatch(keyExchange())
                dispatch({
                    type: authConsts.USER_DATA_ADD_FAILED
                })
                return false
            }
        }
        else if (res.response) {
            toast.error(res.response.data.message)
            dispatch(keyExchange())
            dispatch({
                type: authConsts.USER_DATA_ADD_FAILED
            })
            return false
        }
    }
}

export const signInReq = (form) => {
    return async dispatch => {
        dispatch({
            type: authConsts.USER_LOGIN_REQUEST
        })
        const webAESKey = sessionStorage.getItem('requestEncKey')
        const { encForm, privateKey } = await encryptRequest(form, webAESKey)
        const res = await axiosInstance.post("/auth/signin-request", { 'encData': encForm })

        if (res.status === 200) {
            const decData = await decryptRequest(res.data.payload, res.data.serverPubKey, privateKey, webAESKey)
            if (decData !== false) {
                toast.success("User verification success")
                dispatch({
                    type: authConsts.USER_LOGIN_REQUEST_SUCCESS,
                    payload: decData.hashPass
                })
                return true
            }
            else {
                dispatch(keyExchange())
                dispatch({
                    type: authConsts.USER_LOGIN_REQUEST_FAILED
                })
                return false
            }
        }
        else if (res.response) {
            dispatch(keyExchange())
            toast.error(res.response.data.message)
            dispatch({
                type: authConsts.USER_LOGIN_REQUEST_FAILED
            })
            return false
        }
    }
}

export const login = (form, password) => {
    return async (dispatch) => {
        try {
            dispatch({ type: authConsts.LOGIN_REQUEST })
            const derivedHighEntropyPassword = await generateHighEntropyKey(password)
            const webAESKey = sessionStorage.getItem('requestEncKey')
            const { encForm, privateKey } = await encryptRequest(form, webAESKey)
            const res = await axiosInstance.post('/auth/signin', { 'encData': encForm })
            if (res.status === 200) {
                const decData = await decryptRequest(res.data.payload, res.data.serverPubKey, privateKey, webAESKey)
                if (decData !== false) {
                    const user = decData.user

                    const decPrivate = await decryptAES(user.privateKey, derivedHighEntropyPassword)
                    const importedPrivKey = await importRSAPrivKey(decPrivate)

                    const masterKey = await decryptRSA(user.masterKey, importedPrivKey)
                    const firstName = await decryptAES(user.firstName, masterKey)
                    const lastName = await decryptAES(user.lastName, masterKey)
                    const contact = await decryptAES(user.contact, masterKey)

                    const decUser = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'email': user.email,
                        'contact': contact,
                        'pubKey': user.publicKey
                    }

                    toast.success(`Login Success, Welcome ${decUser.firstName}`, {
                        id: 'login'
                    })

                    sessionStorage.setItem('user', JSON.stringify(decUser))
                    dispatch({
                        type: authConsts.LOGIN_SUCCESS,
                        payload: {
                            'user': decUser
                        }
                    })
                }
                else {
                    dispatch(keyExchange())
                    dispatch({
                        type: authConsts.LOGIN_FALIURE
                    })
                    return false
                }
            }
            else if (res.response) {
                toast.error(res.response.data.message, { id: 'loginf' })
                dispatch(keyExchange())
                dispatch({
                    type: authConsts.LOGIN_FALIURE
                })
                return false
            }
        } catch (error) {
            console.log(error)
            dispatch(keyExchange())
            dispatch({
                type: authConsts.LOGIN_FALIURE
            })
            return false
        }
    }
}

export const isLoggedIn = () => {
    return async (dispatch) => {
        dispatch({ type: authConsts.IS_LOGGEDIN_REQUEST })
        const user = JSON.parse(sessionStorage.getItem('user'))
        if (user) {
            const res = await axiosInstance.post('/auth/isloggedin', { 'email': user.email })
            if (res.status === 200) {
                toast.success("Session Validated", { id: 'svs' })
                dispatch({
                    type: authConsts.IS_LOGGEDIN_SUCCESS,
                })
                dispatch({
                    type: authConsts.LOGIN_SUCCESS,
                    payload: {
                        'user': user
                    }
                })
            }
            else if (res.response) {
                toast.error(res.response.data.message, { id: 'lOut' })
                dispatch({
                    type: authConsts.IS_LOGGEDIN_FAILED
                })
                toast.success("Please Log In", { id: 'pli' })
                const res1 = await axiosInstance.post(`/auth/signout`)
                if (res1.status === 200) {
                    sessionStorage.removeItem('user')
                    dispatch(keyExchange())
                    dispatch(
                        { type: authConsts.LOGOUT_SUCCESS }
                    )
                }
                else {
                    dispatch(keyExchange())
                    dispatch(
                        {
                            type: authConsts.LOGOUT_FAILED
                        })
                }
            }
        }
        else {
            dispatch({
                type: authConsts.IS_LOGGEDIN_FAILED
            })
            toast.success("Please Log In", { id: 'pli' })
            const res = await axiosInstance.post(`/auth/signout`)
            if (res.status === 200) {
                sessionStorage.removeItem('user')
                dispatch(keyExchange())
                dispatch(
                    { type: authConsts.LOGOUT_SUCCESS }
                )
            }
            else {
                dispatch(keyExchange())
                dispatch(
                    {
                        type: authConsts.LOGOUT_FAILED
                    })
            }
        }
    }
}

export const signout = () => {
    return async (dispatch) => {

        dispatch({ type: authConsts.LOGOUT_REQUEST })
        const res = await axiosInstance.post(`/auth/signout`)

        if (res.status === 200) {
            toast.success("Logged Out Successfully!", { id: 'lOut' })
            sessionStorage.removeItem('user')
            dispatch(keyExchange())
            dispatch(
                { type: authConsts.LOGOUT_SUCCESS }
            )
            return true
        }
        else {
            dispatch(keyExchange())
            dispatch(
                {
                    type: authConsts.LOGOUT_FAILED
                })
        }
    }
}

export const tokenRefresh = () => {
    return async (dispatch) => {
        const user = JSON.parse(sessionStorage.getItem('user'))
        if (user) {
            const form = {
                'email': user.email
            }
            const webAESKey = sessionStorage.getItem('requestEncKey')
            const { encForm, privateKey } = await encryptRequest(form, webAESKey)
            const res = await axiosInstance.post('/auth/token', { 'encData': encForm })
            if (res.status === 200 && res.data.message === "Session Valid") {
                const decData = await decryptRequest(res.data.payload, res.data.serverPubKey, privateKey, webAESKey)
                if (decData === false) {
                    dispatch(signout())
                }
            }
            if (res.status === 200 && res.data.message === "Session Extended") {
                const decData = await decryptRequest(res.data.payload, res.data.serverPubKey, privateKey, webAESKey)
                if (decData !== false) {
                    toast.success("Session Extended!", { id: 'token' })
                }
            }
            else if (res.response) {
                toast.error(res.response.data.message, { id: 'token' })
                dispatch(signout())
            }
        }
    }
}

export const passReset = (form) => {
    return async dispatch => {
        const res = await axiosInstance.post("/auth/pass-reset", form)

        if (res.status === 201) {
            toast.success("Password Reset Success")
            window.location.href = '/'
        }
        else if (res.response) {
            toast.error(res.response.data.message)
            window.location.href = '/'
        }
    }

}

export const passResetRequest = (form) => {
    return async dispatch => {
        const res = await axiosInstance.post("/auth/pass-reset-request", form)

        if (res.status === 201) {
            toast.success("Password Reset Email Sent")
        }
        else if (res.response) {
            console.log(res.response)
            toast.error(res.response.data.message)
        }
    }
}