import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import PrivateRoute from './auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Logout from './pages/Logout';
import EditProfile from './pages/EditProfile';
import ChangePassword from './pages/ChangePassword';
import Followers from './pages/Followers';
import Following from './pages/Following';
import Profile from './pages/Profile';

const Routes = () => (
    <Router>
        <Switch>
            <Route exact path="/" component={Login} />
            <PrivateRoute path="/feed" component={Dashboard} />
            <PrivateRoute path="/edit-profile" component={EditProfile} />
            <PrivateRoute path="/change-password" component={ChangePassword} />
            <PrivateRoute path="/followers" component={Followers} />
            <PrivateRoute path="/following" component={Following} />
            <PrivateRoute path="/profile/:id" component={Profile} />
            <Route exact path="/logout" component={Logout} />
        </Switch>
    </Router>
);

export default Routes;


