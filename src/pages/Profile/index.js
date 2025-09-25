import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SocialHeader from '../../components/SocialHeader';
import { Alert, Button } from 'reactstrap';
import { apiFeed } from '../../services/api';
import '../../styles/Profile.css';
import { useExpireToken } from "../../hooks/expireToken";
import { getInitialsImage } from "../../ultils/initialsImage";
import { getVerifyToken } from "../../ultils/verifyToken";
import { useParams } from 'react-router-dom';

export default function ProfilePage() {
    useExpireToken();

    const [feed, setFeed] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isFollowed, setIsFollowed] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [checkingFollowStatus, setCheckingFollowStatus] = useState(true);
    const [likingPosts, setLikingPosts] = useState({}); // Estado para controlar loading por post
    const observer = useRef();
    const [resetFeedTrigger, setResetFeedTrigger] = useState(0);
    const { id } = useParams();
    const name = localStorage.getItem('name') || 'User';
    const rawPhoto = localStorage.getItem('photo');
    const token = localStorage.getItem('login_token');
    const userId = parseInt(localStorage.getItem('user_id'));

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
                follower_id: userId
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
                follower_id: userId
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
                follower_id: userId
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
                
                // Adicionar user_session na query string como no exemplo
                const response = await apiFeed.get(`/profile/${id}/${page}/5?user_session=${userId}`, {
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
    }, [id, userId, token, page]);

    useEffect(() => {
        if (hasMore) {
            const cleanup = fetchFeed();
            return cleanup;
        }
    }, [fetchFeed, hasMore, resetFeedTrigger]);

    useEffect(() => {
        if (id && userId && token) {
            checkIsFollowed();
        }
    }, [id, userId, token, checkIsFollowed]);

    // Reset feed quando o ID do perfil mudar
    useEffect(() => {
        setFeed([]);
        setPage(1);
        setHasMore(true);
        setResetFeedTrigger(prev => prev + 1);
    }, [id]);

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

    // Função para Like post - MESMO PADRÃO DO FEED
    const handleLike = async (postId, currentLikes, isCurrentlyLiked) => {
        // Verifica se já está processando like para este post específico
        if (likingPosts[postId]) return;
        
        // Seta loading apenas para este post
        setLikingPosts(prev => ({ ...prev, [postId]: true }));
        
        try {
            const isValid = await getVerifyToken(token);
            if (!isValid) {
                window.location.href = "/";
                return;
            }

            const endpoint = isCurrentlyLiked ? '/unLike' : '/like';
            const data = {
                post_id: postId,
                user_id: userId
            };

            await apiFeed.post(endpoint, data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            // Atualiza o estado local do feed
            setFeed(prevFeed => 
                prevFeed.map(post => 
                    post.post_id === postId 
                        ? { 
                            ...post, 
                            number_likes: isCurrentlyLiked ? currentLikes - 1 : currentLikes + 1,
                            user_has_liked: isCurrentlyLiked ? 0 : 1
                        } 
                        : post
                )
            );

        } catch (err) {
            setError(`Failed to ${isCurrentlyLiked ? 'unlike' : 'like'} post`);
        } finally {
            // Remove loading apenas para este post
            setLikingPosts(prev => ({ ...prev, [postId]: false }));
        }
    };

    const renderMedia = (url) => {
        if (!url || typeof url !== 'string') return null;

        const isVideo = url.toLowerCase().match(/\.(mp4|webm|ogg)$/);
        const isImage = url.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/);

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

    // Função auxiliar para verificar se o usuário curtiu o post - USA user_has_liked DO BACKEND
    const userHasLiked = (post) => {
        return post.user_has_liked === 1 || post.user_has_liked === true;
    };

    // Renderizar botão Follow/Following
    const renderFollowButton = () => {
        if (userId === parseInt(id)) {
            return (
                <button className="btn btn-outline-secondary btn-sm ms-3" disabled>
                    Your Profile
                </button>
            );
        }

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
                    
                    {feed.length === 0 && !loading && (
                        <p className="text-center text-muted">No posts found</p>
                    )}
                    
                    {feed.map((post, index) => {
                        const isLast = index === feed.length - 1;
                        const photo = isValidPhoto(post.photo)
                            ? post.photo
                            : getInitialsImage(post.name);
                        const hasLiked = userHasLiked(post);
                        const isLiking = likingPosts[post.post_id] || false; // Loading específico por post
                        
                        return (
                            <div
                                key={post.post_id}
                                ref={isLast ? lastPostRef : null}
                                className="profile-item"
                            >
                                <div className="post-header">
                                    <img src={photo} alt={post.name} className="post-user-photo" />
                                    <div className="post-user-info">
                                        <strong className="post-user-name">{post.name}</strong>
                                        <span className="post-date">{new Date(post.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <p className="post-description">{post.description}</p>
                                {renderMedia(post.media_link)}
                                
                                <div className="post-actions">
                                    <div className="likes-count">
                                        {post.number_likes > 0 && (
                                            <span className="likes-text">
                                                {post.number_likes} {post.number_likes === 1 ? 'like' : 'likes'}
                                            </span>
                                        )}
                                    </div>
                                    <Button 
                                        color={hasLiked ? "primary" : "secondary"}
                                        size="sm"
                                        onClick={() => handleLike(post.post_id, post.number_likes, hasLiked)}
                                        disabled={isLiking} // Desabilita apenas este botão
                                        className="like-button"
                                    >
                                        {isLiking ? '...' : (hasLiked ? 'Liked' : 'Like')}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                    {loading && <p className="text-center">Loading...</p>}
                    <br/>
                    {!hasMore && feed.length > 0 && <p className="text-center text-muted">No more posts</p>}
                </div>
            </div>
            <Footer />
        </div>
    );
}