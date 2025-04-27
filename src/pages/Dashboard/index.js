import React from 'react';
import Header from '../../components/Header';
import '../../styles/Dashboard.css';
import SocialHeader from '../../components/SocialHeader';
import Footer from '../../components/Footer';
import { useExpireToken } from "../../hooks/expireToken";
import {getInitialsImage} from "../../ultils/initialsImage";

export default function Dashboard() {
    useExpireToken();

    const name = localStorage.getItem('name') || 'User';
    const rawPhoto = localStorage.getItem('photo');

    const isValidPhoto = (photo) => {
        return photo && photo.trim() !== '' && photo !== 'null' && photo !== 'undefined';
    };

    const user = {
        photo: isValidPhoto(rawPhoto) ? rawPhoto : getInitialsImage(name)
    };

    return (
        <div>
            <SocialHeader user={user} />
            <div className="col-md-6 App">
                <Header title="Feed" />
                <hr className="my-3" />
            </div>
            <br/>
            <br/>
            <br/>
            <Footer />
        </div>
    );
}