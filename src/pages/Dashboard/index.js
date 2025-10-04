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
    const [likingPosts, setLikingPosts] = useState({});
    const [commentingPosts, setCommentingPosts] = useState({});
    const [expandedComments, setExpandedComments] = useState({});
    const [commentsData, setCommentsData] = useState({});
    const [commentTexts, setCommentTexts] = useState({});
    const [commentsLoading, setCommentsLoading] = useState({});
    
    const observer = useRef();
    const commentsEndRefs = useRef({});
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

    const fetchFeed = useCallback(async (pageNum = page) => {
        let isMounted = true;

        if (isMounted) setLoading(true);
        if (isMounted) setError('');
        
        try {
            const isValid = await getVerifyToken(token);
            if (!isValid) {
                window.location.href = "/";
                return;
            }
            
            const response = await apiFeed.get(`/feed/${userId}/${pageNum}/5`, {
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

            if (isMounted && pageNum >= response.data.last_page) {
                setHasMore(false);
            }
        } catch (err) {
            if (isMounted) setError('Failed to load feed');
        } finally {
            if (isMounted) setLoading(false);
        }

        return () => {
            isMounted = false;
        };
    }, [userId, token]);

    useEffect(() => {
        if (hasMore) {
            fetchFeed(page);
        }
    }, [fetchFeed, hasMore, resetFeedTrigger, page]);

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

    // Função para carregar comentários de um post - SIMPLIFICADA
    const fetchComments = async (postId, pageNum = 1) => {
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
    };

    // Função para expandir/recolher comentários - CORRIGIDA
    const toggleComments = async (postId) => {
        if (expandedComments[postId]) {
            // Fechar comentários
            setExpandedComments(prev => ({
                ...prev,
                [postId]: false
            }));
        } else {
            // Abrir comentários - SEMPRE recarregar da página 1
            setExpandedComments(prev => ({
                ...prev,
                [postId]: true
            }));
            
            // Resetar observer quando abrir
            if (commentsEndRefs.current[postId]) {
                commentsEndRefs.current[postId] = null;
            }
            
            await fetchComments(postId, 1);
        }
    };

    // Observer simples para comentários - NOVA ABORDAGEM
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

    // Effect para configurar observer quando comentários mudam
    useEffect(() => {
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
    }, [expandedComments, commentsData, commentsLoading]);

    // Função para adicionar comentário - CORRIGIDA
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

            // Recarregar comentários da página 1 para mostrar o novo comentário no topo
            await fetchComments(postId, 1);
            
            // Limpar texto
            setCommentTexts(prev => ({
                ...prev,
                [postId]: ''
            }));

            // Atualizar contador no feed
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

            // Remover comentário localmente
            setCommentsData(prev => ({
                ...prev,
                [postId]: {
                    ...prev[postId],
                    data: prev[postId]?.data?.filter(comment => comment.id !== commentId) || []
                }
            }));

            // Atualizar contador
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
            
            setPage(1);
            setFeed([]);
            setHasMore(true);
            setResetFeedTrigger(prev => prev + 1);
            
        } catch (err) {
            setError('Failed to create post');
        } finally {
            setPosting(false);
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

    const handleCommentTextChange = (postId, text) => {
        setCommentTexts(prev => ({
            ...prev,
            [postId]: text
        }));
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

                                {/* Área de Comentários */}
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
                                                                    <Link to={`/profile/${comment.user_id}`}>
                                                                        <img 
                                                                            src={commentUserPhoto} 
                                                                            alt={comment.name} 
                                                                            className="comment-user-photo"
                                                                        />
                                                                    </Link>
                                                                    <div className="comment-content">
                                                                        <strong className="comment-user-name">{comment.name}</strong>
                                                                        <p className="comment-text">{comment.comment}</p>
                                                                        <small className="comment-date">
                                                                            {new Date(comment.created_at).toLocaleString()}
                                                                        </small>
                                                                    </div>
                                                                    {(parseInt(comment.user_id) === userId || parseInt(post.user_id) === userId) && (
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
                    {!hasMore && <p className="text-center text-muted">No more posts</p>}
                </div>
            </div>
            <Footer />
        </div>
    );
}