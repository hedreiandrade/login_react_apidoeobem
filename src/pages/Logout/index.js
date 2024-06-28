import { Component } from 'react';

export default class Logout extends Component{

    componentDidMount(){
        localStorage.removeItem('login_token');
        this.props.history.push('/');
    }

    render(){
        return null;
    }
}
