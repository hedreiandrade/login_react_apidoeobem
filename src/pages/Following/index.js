import React, { useEffect, useState, useRef, useCallback } from 'react';
import SocialHeader from '../../components/SocialHeader';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Alert } from 'reactstrap';
import { apiFeed } from '../../services/api';
import '../../styles/FollowingList.css';
import { useExpireToken } from "../../hooks/expireToken";
import { getInitialsImage } from "../../ultils/initialsImage";
import { useHistory, Link } from 'react-router-dom';
import { getVerifyToken } from "../../ultils/verifyToken";

export default function FollowingList() {
    const history = useHistory();

    if(localStorage.getItem('login_token') === null || localStorage.getItem('login_token') === ''){
        history.push("/");
    }
    useExpireToken();

    const [following, setFollowing] = useState([]);
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

    const lastFollowingRef = useCallback(
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

        const fetchFollowing = async () => {
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
                const response = await apiFeed.get(`/following/${userId}/${page}/5`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                
                if (isMounted) {
                    if (response.data.data.length > 0) {
                        setFollowing(prev => {
                            const existingIds = new Set(prev.map(f => f.user_id));
                            const newUniqueFollowing = response.data.data.filter(f => !existingIds.has(f.user_id));
                            return [...prev, ...newUniqueFollowing];
                        });
                    }
                    
                    // CORREÇÃO AQUI: Verifica se há mais páginas
                    if (response.data.current_page >= response.data.last_page || 
                        response.data.data.length === 0) {
                        setHasMore(false);
                    }
                }
            } catch (err) {
                if (isMounted) setError('Failed to load following');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        
        if (isMounted && hasMore) {
            fetchFollowing();
        }
        
        return () => {
            isMounted = false;
        };
    }, [page, hasMore]);

    return (
        <div>
            <SocialHeader user={user} />
            <div className="col-md-6 App">
                <div className="following-container">
                    <Header title="Following" />
                    <hr className="my-3" />
                    {following.map((followingItem, index) => {
                        const isLastItem = index === following.length - 1; // CORREÇÃO: usando followingItem
                        const followingPhoto = isValidPhoto(followingItem.photo)
                            ? followingItem.photo
                            : getInitialsImage(followingItem.name);
                        return (
                            <div
                                key={followingItem.user_id}
                                ref={isLastItem ? lastFollowingRef : null}
                                className="following-item"
                            >
                                <Link to={`/profile/${followingItem.user_id}`}>
                                    <img
                                        src={followingPhoto}
                                        alt={followingItem.name}
                                        className="following-photo"
                                    />
                                </Link>
                                <span className="following-name">{followingItem.name}</span>
                            </div>
                        );
                    })}
                    {error && <Alert color="danger" fade={false} className="text-center" >{error}</Alert>}
                    <br/>
                    <br/>
                    {loading && <p className="text-center text-muted">Loading more...</p>}
                    {!hasMore && following.length > 0 && <p className="text-center text-muted">No more following</p>}
                    {!hasMore && following.length === 0 && <p className="text-center text-muted">No following found</p>}
                    <br/>
                </div>
            </div>
            <Footer />
        </div>
    );
}