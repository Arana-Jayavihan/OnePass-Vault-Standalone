import { getMasterEncKey, getPublicKey, getPrivateKey } from "./contractController.js"

export const getPrivKey = async (req, res) => {
    try {
        const email = req.body.email
        const user = req.user
        if (email === user.email) {
            const result = await getPrivateKey(email, user.hashPass)
            if (result === "Invalid Password") {
                res.status(401).json({
                    message: "Invalid Password"
                })
            }
            else if (result === "User Not Found") {
                res.status(400).json({
                    message: "User Not Found"
                })
            }
            else if (result === false) {
                res.status(500).json({
                    message: "Something Went Wrong!"
                })
            }
            else if (result) {
                res.status(200).json({
                    message: "Private Key Fetched",
                    payload: result
                })
            }

        }
        else {
            res.status(401).json({
                message: "Unauthorized"
            })
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something Went Wrong!",
            error: error
        })
    }
}

export const getMasterEncryptionKey = async (req, res) => {
    try {
        const email = req.body.email
        const user = req.user
        if (email === user.email) {
            const result = await getMasterEncKey(email, user.hashPass)
            if (result === "Invalid Password") {
                res.status(401).json({
                    message: "Invalid Password"
                })
            }
            else if (result === "User Not Found") {
                res.status(400).json({
                    message: "User Not Found"
                })
            }
            else if (result === false) {
                res.status(500).json({
                    message: "Something Went Wrong!"
                })
            }
            else if (result) {
                res.status(200).json({
                    message: "Master Encryption Key Fetched",
                    payload: result
                })
            }
        }
        else {
            res.status(401).json({
                message: "Unauthorized"
            })
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something Went Wrong!",
            error: error
        })
    }
}

export const getPubKey = async (req, res) => {
    try {
        const email = req.body.email
        const result = await getPublicKey(email)
        if (result === "User Not Found") {
            res.status(400).json({
                message: "User Not Found"
            })
        }
        else if (result === false) {
            res.status(500).json({
                message: "Somrthing Went Wrong!"
            })
        }
        else if (result) {
            res.status(200).json({
                message: "Public Key Fetched",
                payload: result
            })
        }

    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something Went Wrong!",
            error: error
        })
    }
}