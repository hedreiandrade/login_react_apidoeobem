// src/components/SocialHeader.js
import React from "react";
import { Link } from "react-router-dom";

export default function SocialHeader({ user }) {
    return (
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#007bff", color: "#fff" }}>
            <Link to="/admin" style={{ color: "#fff", textDecoration: "none" }}><h4>H Media</h4></Link>
            <div style={{ display: "flex", alignItems: "center" }}>
                <Link to="/followers" className="btn btn-outline-primary" style={{ color: "#fff", textDecoration: "none" }}>3M Followers</Link>
                <img src={user.photo} alt="User" style={{ width: "40px", height: "40px", borderRadius: "50%", marginRight: "10px" }} />
                <Link to="/edit-profile" style={{ color: "#fff", textDecoration: "none" }}>Edit</Link>
                <Link to="/logout" className="btn btn-outline-primary" style={{ color: "#fff", textDecoration: "none" }}>Logout</Link>
            </div>
        </header>
    );
}
