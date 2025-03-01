import React from 'react';
import Header from '../../components/Header';
import '../../styles/Dashboard.css';
import SocialHeader from '../../components/SocialHeader';
import Footer from '../../components/Footer';
import { Link } from 'react-router-dom';
import { useExpireToken } from "../../hooks/expireToken";

export default function Dashboard() {
    useExpireToken();

    const user = {
        photo: "https://via.placeholder.com/40", // Aqui você pode substituir pela URL da foto real do usuário
    };

    return (
        <div>
            <SocialHeader user={user} />
            <Header title="Dashboard" />
            <div style={{ padding: "20px" }}>
                <Link to="/logout" className="btn btn-outline-primary">LogOut</Link>
            </div>
            <Footer />
        </div>
    );
}
