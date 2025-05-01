
import {useHistory} from "react-router-dom";

function useToken() {
    const history = useHistory();
    if(localStorage.getItem('login_token') === null || localStorage.getItem('login_token') === ''){
        history.push("/");
    }
    const token = localStorage.getItem('login_token');
    return token;
}

export default useToken;