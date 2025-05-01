import {api} from "../services/api";

export const getVerifyToken = async (token) =>{
    try{
        await api.post('/verifyTokenRedirect', {
            token,
        })
        return true;
    }catch(err){
        return false;
    }
}