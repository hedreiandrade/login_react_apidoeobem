import React from 'react';
import Header from '../../components/Header';
import { Link } from 'react-router-dom';
import {useExpireToken} from "../../hooks/expireToken";

export default function Dashboard() {
    useExpireToken();

    return (
        <div>
            <Header title="Dashboard" />
            <Link to="/logout" className="btn btn-outline-primary">LogOut</Link>
        </div>
    );
}


