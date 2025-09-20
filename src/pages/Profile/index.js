import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SocialHeader from '../../components/SocialHeader';
import { Alert } from 'reactstrap';
import { apiFeed } from '../../services/api';
import '../../styles/Profile.css';
import { useExpireToken } from "../../hooks/expireToken";
import { getInitialsImage } from "../../ultils/initialsImage";
import { getVerifyToken } from "../../ultils/verifyToken";
import { useParams } from 'react-router-dom';

export default function FeedPage() {
    useExpireToken();

    const [feed, setFeed] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const observer = useRef();
    const [resetFeedTrigger] = useState(0);
    const { id } = useParams();
    const name = localStorage.getItem('name') || 'User';
    const rawPhoto = localStorage.getItem('photo');
    const token = localStorage.getItem('login_token');

    const isValidPhoto = (photo) => {
        return photo && photo.trim() !== '' && photo !== 'null' && photo !== 'undefined';
    };

    const user = {
        photo: isValidPhoto(rawPhoto) ? rawPhoto : getInitialsImage(name)
    };

    const fetchFeed = useCallback(() => {
        let isMounted = true;

        const fetchData = async () => {
            if (isMounted)setLoading(true);
            if (isMounted) setError('');
            try {
                const isValid = await getVerifyToken(token);
                if (!isValid) {
                    window.location.href = "/";
                    return;
                }
                const response = await apiFeed.get(`/profile/${id}/${page}/5`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (isMounted && response.data.data.length > 0) {
                    setFeed(prev => {
                        const existingIds = new Set(prev.map(post => post.post_id));
                        const newPosts = response.data.data.filter(post => !existingIds.has(post.post_id));
                        return [...prev, ...newPosts];
                    });
                }

                if (isMounted && page >= response.data.last_page) {
                    setHasMore(false);
                }
            } catch (err) {
                if (isMounted) setError('Failed to load feed');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [id, token, page]);

    useEffect(() => {
        if (hasMore) {
            const cleanup = fetchFeed();
            return cleanup;
        }
    }, [fetchFeed, hasMore, resetFeedTrigger]);

    const lastPostRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    const renderMedia = (url) => {
        if (!url || typeof url !== 'string') return null;

        const isVideo = url.toLowerCase().match(/\.(mp4|webm|ogg)$/);
        const isImage = url.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/);

        if (isVideo) {
            return <video src={url} controls className="post-media" />;
        } else if (isImage) {
            return <img src={url} alt="Post media" className="post-media" />;
        }
        return null;
    };

    return (
        <div>
            <SocialHeader user={user} />
            <div className="col-md-6 App-profile">
                <div className="feed-container">
                    <Header title="Profile" />
                    <hr className="my-3" />
                    {error && <Alert color="danger" fade={false} className="text-center">{error}</Alert>}
                    {feed.map((post, index) => {
                        const isLast = index === feed.length - 1;
                        const photo = isValidPhoto(post.photo)
                            ? post.photo
                            : getInitialsImage(post.name);
                        return (
                            <div
                                key={post.post_id}
                                ref={isLast ? lastPostRef : null}
                                className="post-item"
                            >
                                <div className="post-header">
                                    <img src={photo} alt={post.name} className="post-user-photo" />
                                    <strong className="post-user-name">{post.name}</strong>
                                </div>
                                <p className="post-description">{post.description}</p>
                                {renderMedia(post.media_link)}
                            </div>
                        );
                    })}
                    <br/>
                    {!hasMore && <p className="text-center text-muted">No more posts</p>}
                </div>
            </div>
            <Footer />
        </div>
    );
}