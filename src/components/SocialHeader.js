import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { apiFeed } from "../services/api";
import { useExpireToken } from "../hooks/expireToken";
import { getVerifyToken } from "../ultils/verifyToken";

export default function SocialHeader({ user }) {
    useExpireToken();
    const [followersCount, setFollowersCount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

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

    // Fechar o menu ao clicar fora dele
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#007bff", color: "#fff", position: "relative" }}>
            <Link to="/feed" style={{ color: "#fff", textDecoration: "none" }}><h4>H Media</h4></Link>

            <div style={{ display: "flex", alignItems: "center" }}>
                {/* Contador de seguidores (visível) */}
                <Link to="/followers" className="btn btn-outline-primary" style={{ color: "#fff", textDecoration: "none", marginRight: "15px" }}>
                    <h5 style={{ margin: 0 }}>{loading ? "Loading..." : `${followersCount} Followers`}</h5>
                </Link>

                {/* Menu de três pontos */}
                <div style={{ position: "relative" }} ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        style={{
                            background: "none",
                            border: "none",
                            color: "#fff",
                            fontSize: "24px",
                            cursor: "pointer",
                            padding: "5px 10px",
                            display: "flex",
                            alignItems: "center"
                        }}
                    >
                        &#8942; {/* Unicode para três pontos */}
                    </button>

                    {/* Menu dropdown */}
                    {menuOpen && (
                        <div style={{
                            position: "absolute",
                            right: 0,
                            top: "100%",
                            background: "#fff",
                            borderRadius: "4px",
                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                            minWidth: "150px",
                            zIndex: 1000,
                            padding: "10px 0"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", padding: "10px", borderBottom: "1px solid #eee" }}>
                                <img src={user.photo} alt="User" style={{ width: "40px", height: "40px", borderRadius: "50%", marginRight: "10px" }} />
                                <span style={{ color: "#333", fontWeight: "bold" }}>{user.name}</span>
                            </div>
                            <div style={{ padding: "10px" }}>
                                <Link
                                    to="/edit-profile"
                                    style={{
                                        color: "#007bff",
                                        textDecoration: "none",
                                        display: "block",
                                        padding: "8px 10px",
                                        borderRadius: "4px"
                                    }}
                                    onMouseOver={(e) => e.target.style.background = "#f0f0f0"}
                                    onMouseOut={(e) => e.target.style.background = "transparent"}
                                >
                                    Edit
                                </Link>
                                <Link
                                    to="/logout"
                                    style={{
                                        color: "#007bff",
                                        textDecoration: "none",
                                        display: "block",
                                        padding: "8px 10px",
                                        borderRadius: "4px"
                                    }}
                                    onMouseOver={(e) => e.target.style.background = "#f0f0f0"}
                                    onMouseOut={(e) => e.target.style.background = "transparent"}
                                >
                                    Logout
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}