import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SocialHeader from '../../components/SocialHeader';
import { Alert, Button, Input } from 'reactstrap';
import { apiFeed } from '../../services/api';
import '../../styles/Profile.css';
import { useExpireToken } from "../../hooks/expireToken";
import { getInitialsImage } from "../../ultils/initialsImage";
import { getVerifyToken } from "../../ultils/verifyToken";
import { useParams, Link } from 'react-router-dom';

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
    const [likingPosts, setLikingPosts] = useState({});
    const [commentingPosts, setCommentingPosts] = useState({});
    const [expandedComments, setExpandedComments] = useState({});
    const [commentsData, setCommentsData] = useState({});
    const [commentTexts, setCommentTexts] = useState({});
    const [commentsLoading, setCommentsLoading] = useState({});
    
    const observer = useRef();
    const commentsEndRefs = useRef({});
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

    // Função para carregar comentários de um post - COM useCallback
    const fetchComments = useCallback(async (postId, pageNum = 1) => {
        if (commentsLoading[postId]) return;
        
        setCommentsLoading(prev => ({ ...prev, [postId]: true }));
        
        try {
            const isValid = await getVerifyToken(token);
            if (!isValid) {
                window.location.href = "/";
                return;
            }

            const response = await apiFeed.get(`/comments/${postId}/${pageNum}/5`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setCommentsData(prev => ({
                ...prev,
                [postId]: {
                    data: pageNum === 1 
                        ? response.data.data || []
                        : [...(prev[postId]?.data || []), ...(response.data.data || [])],
                    currentPage: pageNum,
                    lastPage: response.data.last_page,
                    hasMore: pageNum < response.data.last_page
                }
            }));

        } catch (err) {
            setError('Failed to load comments');
        } finally {
            setCommentsLoading(prev => ({ ...prev, [postId]: false }));
        }
    }, [commentsLoading, token]);

    // Função para expandir/recolher comentários
    const toggleComments = async (postId) => {
        if (expandedComments[postId]) {
            setExpandedComments(prev => ({
                ...prev,
                [postId]: false
            }));
        } else {
            setExpandedComments(prev => ({
                ...prev,
                [postId]: true
            }));
            
            if (commentsEndRefs.current[postId]) {
                commentsEndRefs.current[postId] = null;
            }
            
            await fetchComments(postId, 1);
        }
    };

    // Effect para configurar observer quando comentários mudam - CORRIGIDO
    useEffect(() => {
        // Mover a função setupCommentsObserver para dentro do useEffect
        const setupCommentsObserver = (postId) => {
            if (!commentsEndRefs.current[postId]) return;

            const observer = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        const postComments = commentsData[postId];
                        if (postComments?.hasMore && !commentsLoading[postId]) {
                            const nextPage = postComments.currentPage + 1;
                            fetchComments(postId, nextPage);
                        }
                    }
                },
                { threshold: 0.1 }
            );

            observer.observe(commentsEndRefs.current[postId]);
            return observer;
        };

        const observers = {};
        
        Object.keys(expandedComments).forEach(postId => {
            if (expandedComments[postId] && commentsEndRefs.current[postId]) {
                observers[postId] = setupCommentsObserver(postId);
            }
        });

        return () => {
            Object.values(observers).forEach(observer => {
                if (observer) observer.disconnect();
            });
        };
    }, [expandedComments, commentsData, commentsLoading, fetchComments]);

    // Função para adicionar comentário
    const handleAddComment = async (postId) => {
        const commentText = commentTexts[postId] || '';
        if (!commentText.trim()) return;

        setCommentingPosts(prev => ({ ...prev, [postId]: true }));

        try {
            const isValid = await getVerifyToken(token);
            if (!isValid) {
                window.location.href = "/";
                return;
            }

            const data = {
                post_id: postId,
                user_id: userId,
                comment: commentText
            };

            await apiFeed.post('/comments', data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            await fetchComments(postId, 1);
            
            setCommentTexts(prev => ({
                ...prev,
                [postId]: ''
            }));

            setFeed(prevFeed => 
                prevFeed.map(post => 
                    post.post_id === postId 
                        ? { 
                            ...post, 
                            number_comments: (post.number_comments || 0) + 1
                        } 
                        : post
                )
            );

        } catch (err) {
            setError('Failed to add comment');
        } finally {
            setCommentingPosts(prev => ({ ...prev, [postId]: false }));
        }
    };

    // Função para excluir comentário
    const handleDeleteComment = async (postId, commentId) => {
        try {
            const isValid = await getVerifyToken(token);
            if (!isValid) {
                window.location.href = "/";
                return;
            }

            await apiFeed.delete(`/comments/${commentId}`, {
                data: { user_id: userId },
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            setCommentsData(prev => ({
                ...prev,
                [postId]: {
                    ...prev[postId],
                    data: prev[postId]?.data?.filter(comment => comment.id !== commentId) || []
                }
            }));

            setFeed(prevFeed => 
                prevFeed.map(post => 
                    post.post_id === postId 
                        ? { 
                            ...post, 
                            number_comments: Math.max(0, (post.number_comments || 1) - 1)
                        } 
                        : post
                )
            );

        } catch (err) {
            setError('Failed to delete comment');
        }
    };

    // Função para Like post
    const handleLike = async (postId, currentLikes, isCurrentlyLiked) => {
        if (likingPosts[postId]) return;
        
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

    const userHasLiked = (post) => {
        return post.user_has_liked === 1 || post.user_has_liked === true;
    };

    const handleCommentTextChange = (postId, text) => {
        setCommentTexts(prev => ({
            ...prev,
            [postId]: text
        }));
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
                        const isLiking = likingPosts[post.post_id] || false;
                        const isCommenting = commentingPosts[post.post_id] || false;
                        const isCommentsExpanded = expandedComments[post.post_id] || false;
                        const postComments = commentsData[post.post_id]?.data || [];
                        const currentCommentText = commentTexts[post.post_id] || '';
                        const isCommentsLoading = commentsLoading[post.post_id] || false;
                        const hasMoreComments = commentsData[post.post_id]?.hasMore || false;
                        
                        return (
                            <div
                                key={post.post_id}
                                ref={isLast ? lastPostRef : null}
                                className="profile-item"
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
                                    <div className="post-stats">
                                        <span className="likes-text">
                                            {post.number_likes} {post.number_likes === 1 ? 'like' : 'likes'}
                                        </span>
                                        <span className="comments-text">
                                            {post.number_comments || 0} {post.number_comments === 1 ? 'comment' : 'comments'}
                                        </span>
                                    </div>
                                    <div className="post-buttons">
                                        <Button 
                                            color={hasLiked ? "primary" : "secondary"}
                                            size="sm"
                                            onClick={() => handleLike(post.post_id, post.number_likes, hasLiked)}
                                            disabled={isLiking}
                                            className="like-button"
                                        >
                                            {isLiking ? '...' : (hasLiked ? '❤️ Liked' : '🤍 Like')}
                                        </Button>
                                        <Button 
                                            color="info"
                                            size="sm"
                                            onClick={() => toggleComments(post.post_id)}
                                            className="comment-button"
                                        >
                                            💬 Comment
                                        </Button>
                                    </div>
                                </div>

                                {/* Área de Comentários - MESMO DESIGN DO FEED */}
                                {isCommentsExpanded && (
                                    <div className="comments-section">
                                        <div className="comments-list">
                                            {postComments.length > 0 ? (
                                                <>
                                                    {postComments.map((comment) => {
                                                        const commentUserPhoto = isValidPhoto(comment.photo) 
                                                            ? comment.photo 
                                                            : getInitialsImage(comment.name);
                                                        
                                                        return (
                                                            <div key={comment.id} className="comment-item">
                                                                <div className="comment-header">
                                                                    <img 
                                                                        src={commentUserPhoto} 
                                                                        alt={comment.name} 
                                                                        className="comment-user-photo"
                                                                    />
                                                                    <div className="comment-content">
                                                                        <strong className="comment-user-name">{comment.name}</strong>
                                                                        <p className="comment-text">{comment.comment}</p>
                                                                        <small className="comment-date">
                                                                            {new Date(comment.created_at).toLocaleString()}
                                                                        </small>
                                                                    </div>
                                                                    {/* Botão de excluir - APENAS para comentários do usuário logado */}
                                                                    {parseInt(comment.user_id) === userId && (
                                                                        <Button 
                                                                            color="link" 
                                                                            size="sm"
                                                                            className="comment-delete-btn"
                                                                            onClick={() => handleDeleteComment(post.post_id, comment.id)}
                                                                            title="Delete comment"
                                                                        >
                                                                            ×
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    
                                                    {/* Elemento para observar o final */}
                                                    {hasMoreComments && (
                                                        <div 
                                                            ref={el => commentsEndRefs.current[post.post_id] = el}
                                                            style={{ height: '1px', marginTop: '10px' }}
                                                        />
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-muted text-center no-comments">No comments yet</p>
                                            )}
                                            {isCommentsLoading && (
                                                <p className="text-center">Loading more comments...</p>
                                            )}
                                        </div>

                                        {/* Input para adicionar comentário */}
                                        <div className="add-comment-form">
                                            <div className="comment-input-container">
                                                <Input
                                                    type="textarea"
                                                    value={currentCommentText}
                                                    onChange={e => handleCommentTextChange(post.post_id, e.target.value)}
                                                    placeholder="Write a comment..."
                                                    rows="1"
                                                    className="comment-input"
                                                />
                                                <Button 
                                                    color="primary" 
                                                    size="sm"
                                                    onClick={() => handleAddComment(post.post_id)}
                                                    disabled={!currentCommentText.trim() || isCommenting}
                                                    className="comment-submit-btn"
                                                >
                                                    {isCommenting ? '...' : 'Post'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
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