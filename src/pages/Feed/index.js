import React, { useState, useEffect, useRef, useCallback } from 'react';
import Footer from '../../components/Footer';
import SocialHeader from '../../components/SocialHeader';
import { Alert, Button, Input } from 'reactstrap';
import { apiFeed } from '../../services/api';
import '../../styles/Feed.css';
import { useExpireToken } from "../../hooks/expireToken";
import { getInitialsImage } from "../../ultils/initialsImage";
import { getVerifyToken } from "../../ultils/verifyToken";
import { Link } from 'react-router-dom';
import { AiFillHeart } from "react-icons/ai";
import { FaTrash, FaCommentDots } from "react-icons/fa";

export default function FeedPage() {
    useExpireToken();

    const [description, setDescription] = useState('');
    const [mediaFile, setMediaFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [posting, setPosting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
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
    const [deletingPosts, setDeletingPosts] = useState({});
    
    const observer = useRef();
    const commentsEndRefs = useRef({});
    const [resetFeedTrigger, setResetFeedTrigger] = useState(0);
    const fileInputRef = useRef(null);
    const userId = parseInt(localStorage.getItem('user_id'));
    const name = localStorage.getItem('name') || 'User';
    const rawPhoto = localStorage.getItem('photo');
    const token = localStorage.getItem('login_token');

    const isValidPhoto = useCallback((photo) => {
        return photo && photo.trim() !== '' && photo !== 'null' && photo !== 'undefined';
    }, []);

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
    }, [token, page, userId]);

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

    const handleDeletePost = useCallback(async (postId) => {
        if (deletingPosts[postId]) return;

        setDeletingPosts(prev => ({ ...prev, [postId]: true }));

        try {
            const isValid = await getVerifyToken(token);
            if (!isValid) {
                window.location.href = "/";
                return;
            }
            const response = await apiFeed.delete(`/posts/${postId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if(response.data.status === 401){
                setError('Failed to delete a post');
            }else{
                setFeed(prevFeed => prevFeed.filter(post => post.post_id !== postId));
            }
        } catch (err) {
            setError('Failed to delete post');
        } finally {
            setDeletingPosts(prev => ({ ...prev, [postId]: false }));
        }
    }, [token, deletingPosts]);

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
    }, [token, commentsLoading]);

    const toggleComments = useCallback(async (postId) => {
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
    }, [expandedComments, fetchComments]);

    const setupCommentsObserver = useCallback((postId) => {
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
    }, [commentsData, commentsLoading, fetchComments]);

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
    }, [expandedComments, commentsData, commentsLoading, setupCommentsObserver]);

    const handleAddComment = useCallback(async (postId) => {
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
            const response = await apiFeed.post('/comments', data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if(response.data.status === 401){
                setError(`Failed to comment a post`);
            }else{
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
            }
        } catch (err) {
            setError('Failed to comment a post');
        } finally {
            setCommentingPosts(prev => ({ ...prev, [postId]: false }));
        }
    }, [token, commentTexts, fetchComments, userId]);

    const handleDeleteComment = useCallback(async (postId, commentId) => {
        try {
            const isValid = await getVerifyToken(token);
            if (!isValid) {
                window.location.href = "/";
                return;
            }
            const response = await apiFeed.delete(`/comments/${commentId}`, {
                data: { user_id: userId },
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if(response.data.status === 401){
                setError(`Failed to delete comment`);
            }else{
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
            }
        } catch (err) {
            setError('Failed to delete comment');
        }
    }, [token, userId]);

    const handleMediaChange = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;
        setMediaFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setUploadProgress(0);
    }, []);

    const handlePost = useCallback(async () => {
        if (!description.trim() && !mediaFile) return;
        setPosting(true);
        setUploadProgress(0);
        
        let uploadInterval;
        let processInterval;

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

            const hasMedia = !!mediaFile;

            // Configuração do axios com ou sem progresso
            const axiosConfig = {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': hasMedia ? 'multipart/form-data' : 'application/json'
                }
            };

            // Se tem arquivo, adiciona onUploadProgress
            if (hasMedia) {
                // Fase 1: Upload simulado mais lento e gradual (0-60%)
                let currentProgress = 0;
                uploadInterval = setInterval(() => {
                    currentProgress += 1;
                    if (currentProgress >= 60) {
                        clearInterval(uploadInterval);
                        setUploadProgress(60);
                    } else {
                        setUploadProgress(currentProgress);
                    }
                }, 100);

                axiosConfig.onUploadProgress = (progressEvent) => {
                    if (progressEvent.total && progressEvent.loaded) {
                        const realProgress = Math.round(
                            (progressEvent.loaded * 60) / progressEvent.total // Upload real vai até 60%
                        );
                        if (realProgress > currentProgress) {
                            setUploadProgress(realProgress);
                            currentProgress = realProgress;
                        }
                    }
                };
            } else {
                // Se não tem arquivo, vai direto para 60%
                setUploadProgress(60);
            }

            // Fazer o post
            const response = await apiFeed.post('/posts', formData, axiosConfig);
            
            if (hasMedia) {
                clearInterval(uploadInterval);
                setUploadProgress(60); // Garante que chegou a 60% após upload
            }

            // Fase 2: Processamento no servidor (60-100%)
            setUploadProgress(65);
            
            let processProgress = 65;
            processInterval = setInterval(() => {
                processProgress += 2;
                if (processProgress >= 100) {
                    setUploadProgress(100);
                    clearInterval(processInterval);
                    
                    // Aguardar um pouco para mostrar 100% antes de finalizar
                    setTimeout(() => {
                        setDescription('');
                        setMediaFile(null);
                        setPreviewUrl(null);
                        setUploadProgress(0);
                        if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                        }
                        setPage(1);
                        setFeed([]);
                        setHasMore(true);
                        setResetFeedTrigger(prev => prev + 1);
                        setPosting(false);
                    }, 500);
                } else {
                    setUploadProgress(processProgress);
                }
            }, 200);

            if(response.data.status === 401){
                setError('Failed to create post');
                clearInterval(processInterval);
                setPosting(false);
            }

        } catch (err) {
            setError('Failed to create post');
            setUploadProgress(0);
            setPosting(false);
            if (uploadInterval) clearInterval(uploadInterval);
            if (processInterval) clearInterval(processInterval);
        }
    }, [description, mediaFile, token, userId]);

    const handleLike = useCallback(async (postId, currentLikes, isCurrentlyLiked) => {
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
            const response = await apiFeed.post(endpoint, data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if(response.data.status === 401){
                setError(`Failed to ${isCurrentlyLiked ? 'unlike' : 'like'} post`);
            }else{
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
            }
        } catch (err) {
            setError(`Failed to ${isCurrentlyLiked ? 'unlike' : 'like'} post`);
        } finally {
            setLikingPosts(prev => ({ ...prev, [postId]: false }));
        }
    }, [token, likingPosts, userId]);

    const renderMedia = useCallback((url) => {
        if (!url || typeof url !== 'string') return null;

        const isVideo = url.toLowerCase().match(/\.(mp4|webm|ogg)$/);
        const isImage = url.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/);

        if (isVideo) {
            return <video src={url} controls className="post-media" />;
        } else if (isImage) {
            return <img src={url} alt="Post media" className="post-media" />;
        }
        return null;
    }, []);

    const userHasLiked = useCallback((post) => {
        return post.user_has_liked === 1 || post.user_has_liked === true;
    }, []);

    const handleCommentTextChange = useCallback((postId, text) => {
        setCommentTexts(prev => ({
            ...prev,
            [postId]: text
        }));
    }, []);

    // Calcular texto do botão baseado no progresso
    const getButtonText = () => {
        if (!posting) return 'Post';
        
        if (uploadProgress < 60) {
            return `Uploading ${Math.round(uploadProgress)}%`;
        } else if (uploadProgress < 100) {
            return `Processing ${Math.round(uploadProgress)}%`;
        } else {
            return 'Finishing...';
        }
    };

    return (
        <div>
            <SocialHeader user={user} />
            <div className="col-md-6 App-feed">
                <div className="feed-container">
                    <div className="feed-header-container">
                        <div className="user-info-header">
                            <Link to={`/profile/${userId}`}>
                                <img src={user.photo} alt="User" className="header-user-photo" />
                            </Link>
                            <div className="header-user-details">
                                <h4 className="header-user-name">{name}</h4>
                            </div>
                        </div>
                    </div>
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
                        
                        <Button 
                            color="primary" 
                            onClick={handlePost} 
                            disabled={posting}
                            className="posting-button"
                            style={{
                                background: posting 
                                    ? `linear-gradient(90deg, #007bff ${uploadProgress}%, #6c757d ${uploadProgress}%)`
                                    : '',
                                border: 'none',
                                position: 'relative',
                                overflow: 'hidden',
                                transition: 'background 0.3s ease'
                            }}
                        >
                            {posting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    {getButtonText()}
                                </>
                            ) : (
                                'Post'
                            )}
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
                        const isDeleting = deletingPosts[post.post_id] || false;
                        const isPostOwner = parseInt(post.user_id) === userId;
                        
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
                                    
                                    {isPostOwner && (
                                        <Button 
                                            color="link" 
                                            size="sm"
                                            className="post-delete-btn"
                                            onClick={() => handleDeletePost(post.post_id)}
                                            disabled={isDeleting}
                                            title="Delete post"
                                        >
                                            {isDeleting ? (
                                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                            ) : (
                                                <FaTrash size={16} />
                                            )}
                                        </Button>
                                    )}
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
                                            {isLiking ? (
                                                '...'
                                            ) : (
                                                <>
                                                    <AiFillHeart 
                                                        size={16} 
                                                        style={{ 
                                                            marginRight: '5px',
                                                            color: hasLiked ? '#dc3545' : '#6c757d'
                                                        }} 
                                                    />
                                                    {hasLiked ? 'Liked' : 'Like'}
                                                </>
                                            )}
                                        </Button>
                                        <Button 
                                            color="info"
                                            size="sm"
                                            onClick={() => toggleComments(post.post_id)}
                                            className="comment-button"
                                        >
                                            <FaCommentDots size={14} style={{ marginRight: '5px' }} />
                                            Comment
                                        </Button>
                                    </div>
                                </div>

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