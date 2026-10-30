import React, { useEffect, useState, useRef, useCallback } from 'react';
import SocialHeader from '../../components/SocialHeader';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Alert } from 'reactstrap';
import { apiFeed } from '../../services/api';
import '../../styles/BlockedUsers.css';
import { useExpireToken } from "../../hooks/expireToken";
import { getInitialsImage } from "../../ultils/initialsImage";
import { useHistory, Link } from 'react-router-dom';
import { getVerifyToken } from "../../ultils/verifyToken";
import { RiVerifiedBadgeFill } from "react-icons/ri";

export default function BlockedUsersList() {
    const history = useHistory();

    if (localStorage.getItem('login_token') === null || localStorage.getItem('login_token') === '') {
        history.push("/");
    }
    useExpireToken();

    const [blockUsers, setBlockUsers] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState('');
    const observer = useRef();

    const name = localStorage.getItem('name') || 'User';
    const rawPhoto = localStorage.getItem('photo');

    const isValidPhoto = (photo) => {
        return photo && photo.trim() !== '' && photo !== 'null' && photo !== 'undefined';
    };

    const user = {
        photo: isValidPhoto(rawPhoto) ? rawPhoto : getInitialsImage(name)
    };

    const lastBlockUsersRef = useCallback(
        node => {
            if (loading) return;
            if (observer.current) observer.current.disconnect();
            observer.current = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting && hasMore) {
                    setPage(prevPage => prevPage + 1);
                }
            });
            if (node) observer.current.observe(node);
        },
        [loading, hasMore]
    );

    useEffect(() => {
        let isMounted = true;

        const fetchBlockUsers = async () => {
            setLoading(true);
            setError('');
            try {
                const userId = localStorage.getItem('user_id');
                const token = localStorage.getItem('login_token');
                const isValid = await getVerifyToken(token);
                if (!isValid) {
                    window.location.href = "/";
                    return;
                }
                const response = await apiFeed.get(`/blockUsers/${userId}/${page}/5`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (isMounted && response.data.data.length > 0) {
                    setBlockUsers(prev => {
                        const existingIds = new Set(prev.map(f => f.user_block_id_bu));
                        const newUniqueBlockUsers = response.data.data.filter(f => !existingIds.has(f.user_block_id_bu));
                        return [...prev, ...newUniqueBlockUsers];
                    });
                }
                if (isMounted && page >= response.data.last_page) {
                    setHasMore(false);
                }
            } catch (err) {
                if (isMounted) setError('Failed to load blocked users');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        if (isMounted && hasMore) {
            fetchBlockUsers();
        }
        return () => {
            isMounted = false;
        };
    }, [page, hasMore]);

    return (
        <div>
            <SocialHeader user={user} />
            <div className="col-md-6 App">
                <div className="block-users-container">
                    <Header title="Blocked users" />
                    <hr className="my-3" />
                    {blockUsers.map((blockUser, index) => {
                        const isLastItem = index === blockUsers.length - 1;
                        const blockeUserPhoto = isValidPhoto(blockUser.photo)
                            ? blockUser.photo
                            : getInitialsImage(blockUser.name);
                        return (
                            <div
                                key={blockUser.user_block_id_bu}
                                ref={isLastItem ? lastBlockUsersRef : null}
                                className="block-users-item"
                            >
                                <Link to={`/profile/${blockUser.user_block_id_bu}`}>
                                    <img
                                        src={blockeUserPhoto}
                                        alt={blockUser.name}
                                        className="block-users-photo"
                                    />
                                </Link>
                                <span className="block-users-name">
                                    {blockUser.name}
                                    {blockUser.verified_profile === true && (
                                        <RiVerifiedBadgeFill
                                            className="verified-badge"
                                            title="Verified"
                                            size={24}
                                        />
                                    )}
                                </span>
                            </div>
                        );
                    })}
                    {error && <Alert color="danger" fade={false} className="text-center">{error}</Alert>}
                    <br />
                    <br />
                    {!hasMore && <p className="text-center text-muted">No more blocked users</p>}
                    <br />
                </div>
            </div>
            <Footer />
        </div>
    );
}