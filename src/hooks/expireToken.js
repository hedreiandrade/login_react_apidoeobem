import {useEffect, useRef} from "react";
import {getVerifyToken} from "../ultils/verifyToken";
import {useHistory} from "react-router-dom";
import useToken from "./userToken";

export function useExpireToken()  {
    const history = useHistory();
    const token = useToken();
    const componentMounted = useRef(true);

    useEffect(() => {
        const logged = Promise.resolve(getVerifyToken(token));
        logged.then(re => {
            if(!re){
                history.push("/");
            }
        });

        return () => { // This code runs when component is unmounted
            componentMounted.current = false;
        }
    }, [history, token]);
}