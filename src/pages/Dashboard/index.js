import React, { Component } from 'react';
import Header from '../../components/Header';
import { Link } from 'react-router-dom';

export default class Dashboard extends Component{
    render(){
        return (
            <div>
                <Header title="Dashboard" />
                <Link to="/logout" className="btn btn-outline-primary">LogOut</Link>
            </div>
        );
    }
}


