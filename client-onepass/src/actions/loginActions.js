import { toast } from "react-hot-toast"
import axiosInstance from "../helpers/axios.js"
import { vaultConsts } from "./constants.js"
import { encryptAES } from "../helpers/encrypt.js"
import { decryptVaultLogins } from "./vaultActions.js"
import { decryptRequest, encryptRequest } from "./webSessionActions.js"
import { loginConsts } from "./constants.js"

export const addUserLogin = (form) => {
    return async dispatch => {
        dispatch({
            type: vaultConsts.ADD_NEW_VAULT_LOGIN_REQUEST
        })
        
        const encLoginName = await encryptAES(form.loginName, form.vaultKey)
        const encLoginUrl = await encryptAES(form.loginUrl, form.vaultKey)
        const encLoginUserName = await encryptAES(form.loginUsername, form.vaultKey)
        const encLoginPassword = await encryptAES(form.loginPassword, form.vaultKey)

        let encCustomFields = []
        for (let field of form.customFields) {
            const encFieldName = await encryptAES(field.name, form.vaultKey)
            const encFieldValue = await encryptAES(field.value, form.vaultKey)
            encCustomFields.push({
                name: encFieldName,
                value: encFieldValue
            })
        }
        const addLoginForm = {
            loginName: encLoginName,
            loginUrl: encLoginUrl,
            loginUsername: encLoginUserName,
            loginPassword: encLoginPassword,
            vaultIndex: form.vaultIndex,
            email: form.email,
            customFields: encCustomFields
        }
        const webAESKey = sessionStorage.getItem('requestEncKey')
        const { encForm, privateKey } = await encryptRequest(addLoginForm, webAESKey)
        const res = await axiosInstance.post("/login/add-login", { 'encData': encForm })

        if (res.status === 201) {
            const decData = await decryptRequest(res.data.payload, res.data.serverPubKey, privateKey, webAESKey)
            const decLogins = await decryptVaultLogins(decData, form.vaultKey)
            toast.success("Login Saved", { id: 'las' })
            dispatch({
                type: vaultConsts.ADD_NEW_VAULT_LOGIN_SUCCESS,
                payload: decLogins
            })
            return true
        }
        else if (res.response) {
            toast.error(res.response.data.message, { id: 'lae' })
            dispatch({
                type: vaultConsts.ADD_NEW_VAULT_LOGIN_FAILED
            })
            return false
        }
    }
}

export const deleteVaultLogin = (email, loginIndex, vaultIndex, vaultKey) => {
    return async dispatch => {
        dispatch({
            type: loginConsts.REMOVE_USER_LOGIN_REQUEST
        })
        const removeLoginForm = {
            email: email,
            vaultIndex: vaultIndex,
            loginIndex: loginIndex
        }

        const webAESKey = sessionStorage.getItem('requestEncKey')
        const { encForm, privateKey } = await encryptRequest(removeLoginForm, webAESKey)
        const res = await axiosInstance.post('/login/remove-login', { 'encData': encForm })

        if (res.status === 201) {
            const decData = await decryptRequest(res.data.payload, res.data.serverPubKey, privateKey, webAESKey)
            const decLogins = await decryptVaultLogins(decData, vaultKey)
            toast.success("Login Removed", { id: 'lrs' })
            dispatch({
                type: loginConsts.REMOVE_USER_LOGIN_SUCCESS,
                payload: decLogins
            })
        }
        else if (res.response) {
            toast.error(res.response.data.message, { id: 'lre' })
            dispatch({
                type: loginConsts.REMOVE_USER_LOGIN_FAILED
            })
            return false
        }
    }
}