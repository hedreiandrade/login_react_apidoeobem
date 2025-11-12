import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import PrivateRoute from './auth';
import Login from './pages/Login';
import Feed from './pages/Feed';
import Logout from './pages/Logout';
import EditProfile from './pages/EditProfile';
import ChangePassword from './pages/ChangePassword';
import Followers from './pages/Followers';
import Following from './pages/Following';
import FollowersUsers from './pages/FollowersUsers';
import FollowingUsers from './pages/FollowingUsers';
import Profile from './pages/Profile';
import Search from './pages/Search';
import ForgotPassword from './pages/ForgotPassword';

const Routes = () => (
    <Router>
        <Switch>
            <Route exact path="/" component={Login} />
            <PrivateRoute path="/feed" component={Feed} />
            <PrivateRoute path="/edit-profile" component={EditProfile} />
            <PrivateRoute path="/change-password" component={ChangePassword} />
            <PrivateRoute path="/followers" component={Followers} />
            <PrivateRoute path="/following" component={Following} />
            <PrivateRoute path="/followersUsers/:id" component={FollowersUsers} />
            <PrivateRoute path="/followingUsers/:id" component={FollowingUsers} />
            <PrivateRoute path="/profile/:id" component={Profile} />
            <PrivateRoute path="/search" component={Search} />
            <Route path="/forgot-password" component={ForgotPassword} />
            <Route exact path="/logout" component={Logout} />
        </Switch>
    </Router>
);

export default Routes;


