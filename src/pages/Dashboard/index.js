import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import { Link } from 'react-router-dom';
import {useExpireToken} from "../../hooks/expireToken";

export default function Dashboard() {
    useExpireToken();
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        setLoading(false);
    }, []);

    if(loading){
        return '';
    }

    return (
        <div>
            <Header title="Dashboard" />
            <Link to="/logout" className="btn btn-outline-primary">LogOut</Link>
        </div>
    );
}


