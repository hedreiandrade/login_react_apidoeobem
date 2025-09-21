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
    const [isFollowed, setIsFollowed] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [checkingFollowStatus, setCheckingFollowStatus] = useState(true); // Novo estado
    const observer = useRef();
    const [resetFeedTrigger] = useState(0);
    const { id } = useParams();
    const name = localStorage.getItem('name') || 'User';
    const rawPhoto = localStorage.getItem('photo');
    const token = localStorage.getItem('login_token');
    const userId = localStorage.getItem('user_id');

    const isValidPhoto = (photo) => {
        return photo && photo.trim() !== '' && photo !== 'null' && photo !== 'undefined';
    };

    const user = {
        photo: isValidPhoto(rawPhoto) ? rawPhoto : getInitialsImage(name)
    };

    // Função para verificar se já segue o usuário
    const checkIsFollowed = useCallback(async () => {
        try {
            setCheckingFollowStatus(true);
            const response = await apiFeed.post('/isFollowed', {
                user_id: parseInt(id),
                follower_id: parseInt(userId)
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            setIsFollowed(response.data.is_followed);
        } catch (err) {
            console.error('Error checking follow status:', err);
        } finally {
            setCheckingFollowStatus(false);
        }
    }, [id, userId, token]);

    // Função para seguir usuário
    const followUser = async () => {
        setFollowLoading(true);
        try {
            await apiFeed.post('/follow', {
                user_id: parseInt(id),
                follower_id: parseInt(userId)
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setIsFollowed(true);
        } catch (err) {
            setError('Failed to follow user');
        } finally {
            setFollowLoading(false);
        }
    };

    // Função para deixar de seguir usuário
    const unfollowUser = async () => {
        setFollowLoading(true);
        try {
            await apiFeed.post('/unFollow', {
                user_id: parseInt(id),
                follower_id: parseInt(userId)
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setIsFollowed(false);
        } catch (err) {
            setError('Failed to unfollow user');
        } finally {
            setFollowLoading(false);
        }
    };

    const fetchFeed = useCallback(() => {
        let isMounted = true;

        const fetchData = async () => {
            if (isMounted) setLoading(true);
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

    useEffect(() => {
        // Verificar status de follow quando o componente montar ou o ID mudar
        if (id && userId && token) {
            checkIsFollowed();
        }
    }, [id, userId, token, checkIsFollowed]);

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
            return (
                <div className="media-container">
                    <video src={url} controls className="post-media" />
                </div>
            );
        } else if (isImage) {
            return (
                <div className="media-container">
                    <img src={url} alt="Post media" className="post-media" />
                </div>
            );
        }
        return null;
    };

    // Renderizar botão Follow/Following
    const renderFollowButton = () => {
        if (parseInt(userId) === parseInt(id)) {
            return null; // Não mostrar botão se for o próprio perfil
        }

        // Mostrar loading enquanto verifica o status inicial
        if (checkingFollowStatus) {
            return (
                <button className="btn btn-secondary btn-sm ms-3" disabled>
                    Loading...
                </button>
            );
        }

        if (followLoading) {
            return (
                <button className="btn btn-secondary btn-sm ms-3" disabled>
                    {isFollowed ? 'Unfollowing...' : 'Following...'}
                </button>
            );
        }

        if (isFollowed) {
            return (
                <button 
                    className="btn btn-secondary btn-sm ms-3" 
                    onClick={unfollowUser}
                >
                    Following
                </button>
            );
        } else {
            return (
                <button 
                    className="btn btn-primary btn-sm ms-3" 
                    onClick={followUser}
                >
                    Follow
                </button>
            );
        }
    };

    return (
        <div>
            <SocialHeader user={user} />
            <br/>
            <div className="col-md-6 App-profile">
                <div className="profile-container">
                    <div className="d-flex justify-content-between align-items-center">
                        <Header title="Profile" />
                        {renderFollowButton()}
                    </div>
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
                                className="profile-item"
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