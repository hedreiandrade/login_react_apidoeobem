// src/components/SocialHeader.js
import React from "react";
import { Link } from "react-router-dom";

export default function SocialHeader({ user }) {
    return (
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#007bff", color: "#fff" }}>
            <h3>Social Media</h3>
            <div style={{ display: "flex", alignItems: "center" }}>
                <img src={user.photo} alt="User" style={{ width: "40px", height: "40px", borderRadius: "50%", marginRight: "10px" }} />
                <Link to="/edit-profile" style={{ color: "#fff", textDecoration: "none" }}>Editar Perfil</Link>
            </div>
        </header>
    );
}
