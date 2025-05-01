import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFeed } from "../services/api";
import { useExpireToken } from "../hooks/expireToken";
import { getVerifyToken } from "../ultils/verifyToken";

export default function SocialHeader({ user }) {
    useExpireToken();
    const [followersCount, setFollowersCount] = useState(null); // Inicialmente null
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function fetchFollowersCount() {
            try {
                const userId = localStorage.getItem('user_id');
                const token = localStorage.getItem('login_token');
                const isValid = await getVerifyToken(token);
                if (!isValid) {
                    window.location.href = "/";
                    return;
                }
                const response = await apiFeed.get(`/followers/${userId}/1/5`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (isMounted && response.data && typeof response.data.total === 'number') {
                    setFollowersCount(response.data.total);
                }
            } catch (error) {
                if (isMounted) console.error('Failed to fetch followers count', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        if (isMounted) fetchFollowersCount();
        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#007bff", color: "#fff" }}>
            <Link to="/admin" style={{ color: "#fff", textDecoration: "none" }}><h4>H Media</h4></Link>
            <div style={{ display: "flex", alignItems: "center" }}>
                <Link to="/followers" className="btn btn-outline-primary" style={{ color: "#fff", textDecoration: "none" }}>
                    <h5>{loading ? "Loading followers..." : `${followersCount} Followers`}</h5>
                </Link>
                <img src={user.photo} alt="User" style={{ width: "40px", height: "40px", borderRadius: "50%", margin: "0 10px" }} />
                <Link to="/edit-profile" style={{ color: "#fff", textDecoration: "none", marginRight: "10px" }}>Edit</Link>
                <Link to="/logout" className="btn btn-outline-primary" style={{ color: "#fff", textDecoration: "none" }}>Logout</Link>
            </div>
        </header>
    );
}
