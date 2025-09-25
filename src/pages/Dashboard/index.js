import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SocialHeader from '../../components/SocialHeader';
import { Alert, Button, Input } from 'reactstrap';
import { apiFeed } from '../../services/api';
import '../../styles/Dashboard.css';
import { useExpireToken } from "../../hooks/expireToken";
import { getInitialsImage } from "../../ultils/initialsImage";
import { getVerifyToken } from "../../ultils/verifyToken";
import { Link } from 'react-router-dom';

export default function FeedPage() {
    useExpireToken();

    const [description, setDescription] = useState('');
    const [mediaFile, setMediaFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [posting, setPosting] = useState(false);
    const [feed, setFeed] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [likingPosts, setLikingPosts] = useState({}); // Estado para controlar loading por post
    const observer = useRef();
    const [resetFeedTrigger, setResetFeedTrigger] = useState(0);
    const fileInputRef = useRef(null);
    const userId = parseInt(localStorage.getItem('user_id'));
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
            if (isMounted) setLoading(true);
            if (isMounted) setError('');
            try {
                const isValid = await getVerifyToken(token);
                if (!isValid) {
                    window.location.href = "/";
                    return;
                }
                const response = await apiFeed.get(`/feed/${userId}/${page}/5`, {
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
    }, [userId, token, page]);

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

    const handleMediaChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setMediaFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handlePost = async () => {
        if (!description.trim() && !mediaFile) return;
        setPosting(true);

        try {
            const isValid = await getVerifyToken(token);
            if (!isValid) {
                window.location.href = "/";
                return;
            }

            const formData = new FormData();
            formData.append('user_id', userId);
            formData.append('description', description);
            if (mediaFile) {
                formData.append('media_link', mediaFile);
            }

            await apiFeed.post('/posts', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setDescription('');
            setMediaFile(null);
            setPreviewUrl(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setFeed([]);
            setPage(1);
            setHasMore(true);
            setResetFeedTrigger(prev => prev + 1);
        } catch (err) {
            setError('Failed to create post');
        } finally {
            setPosting(false);
        }
    };

    // Função para Like post - CORRIGIDA
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
                            user_has_liked: !isCurrentlyLiked
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
        const isImage = url.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/);

        if (isVideo) {
            return <video src={url} controls className="post-media" />;
        } else if (isImage) {
            return <img src={url} alt="Post media" className="post-media" />;
        }
        return null;
    };

    const userHasLiked = (post) => {
        return post.user_has_liked === 1 || post.user_has_liked === true;
    };

    return (
        <div>
            <SocialHeader user={user} />
            <div className="col-md-6 App-feed">
                <div className="feed-container">
                    <Header title="Feed" />
                    <hr className="my-3" />
                    <div className="create-post">
                        <img src={user.photo} alt="User" className="post-user-photo" />
                        <Input
                            type="textarea"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="What's on your mind?"
                            className="post-input"
                        />
                        <Input
                            type="file"
                            accept="image/*,video/*"
                            onChange={handleMediaChange}
                            className="post-file-input"
                            innerRef={fileInputRef}
                        />
                        {previewUrl && (
                            <div className="preview-container">
                                {renderMedia(previewUrl)}
                            </div>
                        )}
                        <Button color="primary" onClick={handlePost} disabled={posting}>
                            {posting ? 'Posting...' : 'Post'}
                        </Button>
                    </div>
                    <hr />
                    {error && <Alert color="danger" fade={false} className="text-center">{error}</Alert>}
                    
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
                                className="post-item"
                            >
                                <div className="post-header">
                                    <Link to={`/profile/${post.user_id}`}>
                                        <img src={photo} alt={post.name} className="post-user-photo" />
                                    </Link>
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
                    {!hasMore && <p className="text-center text-muted">No more posts</p>}
                </div>
            </div>
            <Footer />
        </div>
    );
}