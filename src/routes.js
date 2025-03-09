import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import PrivateRoute from './auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Logout from './pages/Logout';
import EditProfile from './pages/EditProfile';
import ChangePassword from './pages/ChangePassword';

const Routes = () => (
    <Router>
        <Switch>
            <Route exact path="/" component={Login} />
            <PrivateRoute path="/admin" component={Dashboard} />
            <PrivateRoute path="/edit-profile" component={EditProfile} />
            <PrivateRoute path="/change-password" component={ChangePassword} />
            <Route exact path="/logout" component={Logout} />
        </Switch>
    </Router>
);

export default Routes;


