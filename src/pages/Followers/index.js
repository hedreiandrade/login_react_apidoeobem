import React, { useEffect, useState, useRef, useCallback } from 'react';
import SocialHeader from '../../components/SocialHeader';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Spinner, Alert } from 'reactstrap';
import { apiFeed } from '../../services/api';
import '../../styles/FollowersList.css';

export default function FollowersList() {
    const [followers, setFollowers] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState('');
    const observer = useRef();
    const user = {
        photo: localStorage.getItem('photo')
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
        const fetchFollowers = async () => {
            setLoading(true);
            setError('');
            try {
                const userId = localStorage.getItem('user_id');
                const token = localStorage.getItem('login_token');
                const response = await apiFeed.get(`/followers/${userId}/${page}/5`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (response.data.data.length > 0) {
                    setFollowers(prev => {
                        const existingIds = new Set(prev.map(f => f.follower_id));
                        const newUniqueFollowers = response.data.data.filter(f => !existingIds.has(f.follower_id));
                        return [...prev, ...newUniqueFollowers];
                    });
                }                             
                if (page >= response.data.last_page) {
                    setHasMore(false);
                }
            } catch (err) {
                setError('Failed to load followers');
            } finally {
                setLoading(false);
            }
        };
        if (hasMore) {
            fetchFollowers();
        }
    }, [page, hasMore]);

    return (
        <div>
            <SocialHeader user={user} />
            <div className="followers-container">
                <Header title="Followers" />
                <hr className="my-3" />
                {followers.map((follower, index) => {
                    const isLastItem = index === followers.length - 1;
                    return (
                        <div
                            key={follower.follower_id}
                            ref={isLastItem ? lastFollowerRef : null}
                            className="follower-item"
                        >
                            <img
                                src={follower.photo}
                                alt={follower.name}
                                className="follower-photo"
                            />
                            <span className="follower-name">{follower.name}</span>
                        </div>
                    );
                })}
                {loading && <Spinner color="primary" className="d-block mx-auto my-3" />}
                {error && <Alert color="danger" className="text-center">{error}</Alert>}
                {!hasMore && <p className="text-center text-muted">No more followers</p>}
            </div>
            <Footer />
        </div>
    );
}