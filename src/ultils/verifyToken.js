import {api} from "../services/api";

export const getVerifyToken = async (token) =>{
    try{
        const response = await api.post('/verifyTokenRedirect', {
            token,
        })
        return response.data.status !== 401;
    }catch(err){
        return false;
    }
}