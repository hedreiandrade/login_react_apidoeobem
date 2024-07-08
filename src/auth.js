import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import {api} from './services/api';

const isAuth = async () => {
    if(localStorage.getItem('login_token') !== null){
        const param = {token: localStorage.getItem('login_token')};
        const response = await api.post('/verifyTokenRedirect', param);
        if (response.data.status === 200){
            return true;
        }else{
            return false;
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