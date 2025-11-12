import React, { useEffect, useState, useRef, useCallback } from 'react';
import SocialHeader from '../../components/SocialHeader';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Alert } from 'reactstrap';
import { apiFeed } from '../../services/api';
import '../../styles/FollowersList.css';
import { useExpireToken } from "../../hooks/expireToken";
import { getInitialsImage } from "../../ultils/initialsImage";
import { useHistory, Link, useParams } from 'react-router-dom';
import { getVerifyToken } from "../../ultils/verifyToken";

export default function FollowersList() {
    const history = useHistory();

    if(localStorage.getItem('login_token') === null || localStorage.getItem('login_token') === ''){
        history.push("/");
    }
    useExpireToken();

    const [followers, setFollowers] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState('');
    const observer = useRef();
    const { id } = useParams();
    const name = localStorage.getItem('name') || 'User';
    const rawPhoto = localStorage.getItem('photo');

    const isValidPhoto = (photo) => {
        return photo && photo.trim() !== '' && photo !== 'null' && photo !== 'undefined';
    };

    const user = {
        photo: isValidPhoto(rawPhoto) ? rawPhoto : getInitialsImage(name)
    };

    const lastFollowerRef = useCallback(
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

        const fetchFollowers = async () => {
            setLoading(true);
            setError('');
            try {
                const token = localStorage.getItem('login_token');
                const isValid = await getVerifyToken(token);
                if (!isValid) {
                    window.location.href = "/";
                    return;
                }
                const response = await apiFeed.get(`/followersUsers/${id}/${page}/5`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (isMounted && response.data.data.length > 0) {
                    setFollowers(prev => {
                        const existingIds = new Set(prev.map(f => f.follower_id));
                        const newUniqueFollowers = response.data.data.filter(f => !existingIds.has(f.follower_id));
                        return [...prev, ...newUniqueFollowers];
                    });
                }
                if (isMounted && page >= response.data.last_page) {
                    setHasMore(false);
                }
            } catch (err) {
                if (isMounted) setError('Failed to load followers');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        if (isMounted && hasMore) {
            fetchFollowers();
        }
        return () => {
            isMounted = false;
        };
    }, [page, hasMore, id]);

    return (
        <div>
            <SocialHeader user={user} />
            <div className="col-md-6 App">
                <div className="followers-container">
                    <Header title="Followers" />
                    <hr className="my-3" />
                    {followers.map((follower, index) => {
                        const isLastItem = index === followers.length - 1;
                        const followerPhoto = isValidPhoto(follower.photo)
                            ? follower.photo
                            : getInitialsImage(follower.name);
                        return (
                            <div
                                key={follower.follower_id}
                                ref={isLastItem ? lastFollowerRef : null}
                                className="follower-item"
                            >
                                <Link to={`/profile/${follower.follower_id}`}>
                                    <img
                                        src={followerPhoto}
                                        alt={follower.name}
                                        className="follower-photo"
                                    />
                                </Link>
                                <span className="follower-name">{follower.name}</span>
                            </div>
                        );
                    })}
                    {error && <Alert color="danger" fade={false} className="text-center" >{error}</Alert>}
                    <br/>
                    <br/>
                    {!hasMore && <p className="text-center text-muted">No more followers</p>}
                    <br/>
                </div>
            </div>
            <Footer />
        </div>
    );
}
