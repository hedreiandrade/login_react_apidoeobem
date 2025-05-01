import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { getVerifyToken } from "./ultils/verifyToken";

const isAuth = async () => {
    if(localStorage.getItem('login_token') !== null){
        const isValid = await getVerifyToken(localStorage.getItem('login_token'));
        if (!isValid) {
            window.location.href = "/";
            return false;
        }else{
            return true;
        }
    }else{
        return false;
    }
};

const PrivateRoute = ({component: Component, ...rest}) => {
    return (
        <Route
            {...rest}
            render={props =>
            isAuth() ? (
                <Component {...props} />
            ): (
                <Redirect to={'/'} />
            )}
        />
    );
}

export default PrivateRoute;