import { useEffect } from "react";
import { useHistory } from "react-router-dom";
import useToken from "./userToken";
import { getVerifyToken } from "../ultils/verifyToken";

export function useExpireToken() {
    const history = useHistory();
    const token = useToken();

    useEffect(() => {
        if (!token) {
            history.push("/");
            return;
        }
        const isValid = getVerifyToken(token);
        Promise.resolve(isValid).then(valid => {
            if (!valid) {
                history.push("/");
            }
        });
    }, [token, history]);
}
