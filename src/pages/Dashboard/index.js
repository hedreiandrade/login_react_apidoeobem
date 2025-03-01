import React from 'react';
import Header from '../../components/Header';
import '../../styles/Dashboard.css';
import SocialHeader from '../../components/SocialHeader';
import Footer from '../../components/Footer';
import { useExpireToken } from "../../hooks/expireToken";

export default function Dashboard() {
    useExpireToken();

    const user = {
        photo: localStorage.getItem('photo')
    };

    return (
        <div>
            <SocialHeader user={user} />
            <br/>
            <br/>
            <br/>
            <Header title="Feed" />
            <br/>
            <br/>
            <br/>
            <Footer />
        </div>
    );
}
