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
import { BiRepost } from "react-icons/bi";

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
    const [deletingPosts, setDeletingPosts] = useState({});
    const [repostingPosts, setRepostingPosts] = useState({});
    
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

    // Adicionar useEffect para limpar URLs de preview
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Função para fazer repost
    const handleRepost = useCallback(async (originalPostId, originalUserId, originalDescription, originalMediaLink, originalUserName) => {
        if (repostingPosts[originalPostId]) return;

        setRepostingPosts(prev => ({ ...prev, [originalPostId]: true }));

        try {
            const isValid = await getVerifyToken(token);
            if (!isValid) {
                window.location.href = "/";
                return;
            }

            const repostData = {
                user_id: userId,
                description: originalDescription,
                media_link: originalMediaLink,
                is_repost: true,
                original_user_id: originalUserId,
                original_post_id: originalPostId,
            };

            const response = await apiFeed.post('/rePosts', repostData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.data.status === 401) {
                setError(response.data.error);
            } else {
                // Atualiza o feed para refletir o novo repost
                // Atualiza o contador de reposts localmente
                setFeed(prevFeed => 
                    prevFeed.map(post => 
                        post.post_id === originalPostId 
                            ? { 
                                ...post, 
                                number_reposts: (post.number_reposts || 0) + 1
                            } 
                            : post
                    )
                );
                setPage(1);
                setFeed([]);
                setHasMore(true);
                setResetFeedTrigger(prev => prev + 1);
            }
        } catch (err) {
            setError('Failed to repost');
        } finally {
            setRepostingPosts(prev => ({ ...prev, [originalPostId]: false }));
        }
    }, [token, repostingPosts, userId]);

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
        
        // Usar requestAnimationFrame para evitar loops
        requestAnimationFrame(() => {
            observer.current = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting && hasMore) {
                    setPage(prevPage => prevPage + 1);
                }
            }, {
                rootMargin: '100px',
                threshold: 0.1
            });
            
            if (node) observer.current.observe(node);
        });
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
        
        // Limpar URL anterior se existir
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        
        setMediaFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    }, [previewUrl]);

    const handlePost = useCallback(async () => {
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
            const response = await apiFeed.post('/posts', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            if(response.data.status === 401){
                setError('Failed to create post');
            }else{
                setDescription('');
                setMediaFile(null);
                
                // Limpar preview URL
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                }
                
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                setPage(1);
                setFeed([]);
                setHasMore(true);
                setResetFeedTrigger(prev => prev + 1);
            }
        } catch (err) {
            setError('Failed to create post');
        } finally {
            setPosting(false);
        }
    }, [description, mediaFile, token, userId, previewUrl]);

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
            return (
                <video 
                    src={url} 
                    controls 
                    className="post-media" 
                    onLoadedData={(e) => {
                        // Definir dimensões para evitar redimensionamento
                        e.target.style.width = '100%';
                        e.target.style.height = 'auto';
                    }}
                />
            );
        } else if (isImage) {
            return (
                <img 
                    src={url} 
                    alt="Post media" 
                    className="post-media"
                    onLoad={(e) => {
                        // Definir dimensões para evitar redimensionamento
                        e.target.style.width = '100%';
                        e.target.style.height = 'auto';
                    }}
                    loading="lazy"
                />
            );
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

    return (
        <div>
            <SocialHeader user={user} />
            <div className="col-md-6 App-feed">
                <div className="feed-container">
                    <div className="feed-header-container">
                        <div className="user-info-header">
                            <Link to={`/profile/${userId}`}>
                                <img 
                                    src={user.photo} 
                                    alt="User" 
                                    className="header-user-photo"
                                    onLoad={(e) => {
                                        e.target.style.width = '140px';
                                        e.target.style.height = '140px';
                                    }}
                                />
                            </Link>
                            <div className="header-user-details">
                                <h4 className="header-user-name">{name}</h4>
                            </div>
                        </div>
                    </div>
                    <hr className="my-3" />
                    <div className="create-post">
                        <img 
                            src={user.photo} 
                            alt="User" 
                            className="post-user-photo"
                            onLoad={(e) => {
                                e.target.style.width = '40px';
                                e.target.style.height = '40px';
                            }}
                        />
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
                        const isDeleting = deletingPosts[post.post_id] || false;
                        const isPostOwner = parseInt(post.user_id) === userId;
                        const isReposting = repostingPosts[post.post_id] || false;
                        
                        return (
                            <div
                                key={post.post_id}
                                ref={isLast ? lastPostRef : null}
                                className="post-item"
                            >
                                {/* Header do post com indicador de repost - IGUAL AO EXEMPLO DO X */}
                                <div className="post-header">
                                    {post.is_repost ? (
                                        <>
                                            <div className="repost-indicator">
                                                <BiRepost size={14} style={{ marginRight: '5px' }} />
                                                <small className="text-muted">
                                                    <strong>{post.name}</strong> reposted
                                                </small>
                                            </div>
                                            <Link to={`/profile/${post.original_user_id}`}>
                                                <img 
                                                    src={isValidPhoto(post.original_user_photo) 
                                                        ? post.original_user_photo 
                                                        : getInitialsImage(post.original_user_name || 'User')} 
                                                    alt={post.original_user_name} 
                                                    className="post-user-photo"
                                                    onLoad={(e) => {
                                                        e.target.style.width = '40px';
                                                        e.target.style.height = '40px';
                                                    }}
                                                />
                                            </Link>
                                        </>
                                    ) : (
                                        <Link to={`/profile/${post.user_id}`}>
                                            <img 
                                                src={photo} 
                                                alt={post.name} 
                                                className="post-user-photo"
                                                onLoad={(e) => {
                                                    e.target.style.width = '40px';
                                                    e.target.style.height = '40px';
                                                }}
                                            />
                                        </Link>
                                    )}
                                    <div className="post-user-info">
                                        <div className="post-user-name-container">
                                            <strong className="post-user-name">
                                                {post.is_repost ? post.original_user_name : post.name}
                                            </strong>
                                        </div>
                                        <span className="post-date">{new Date(post.created_at).toLocaleDateString()}</span>
                                    </div>
                                    
                                    {/* Botão de deletar disponível para posts do usuário (originais e reposts) */}
                                    {(isPostOwner || (post.is_repost && post.original_user_id === userId)) ? (
                                        <Button 
                                            color="link" 
                                            size="sm"
                                            className="post-delete-btn"
                                            onClick={() => handleDeletePost(post.post_id)}
                                            disabled={isDeleting}
                                            title={post.is_repost ? "Delete repost" : "Delete post"}
                                        >
                                            {isDeleting ? (
                                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                            ) : (
                                                <FaTrash size={16} />
                                            )}
                                        </Button>
                                    ) : null}
                                </div>
                                
                                {/* A descrição mantém o conteúdo original */}
                                <p className="post-description">{post.description}</p>
                                {renderMedia(post.media_link)}
                                
                                <div className="post-actions">
                                    {/* Botões com números e ícones */}
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
                                                    {post.number_likes || 0}
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
                                            {post.number_comments || 0}
                                        </Button>
                                        <Button 
                                            color="primary"
                                            size="sm"
                                            onClick={() => handleRepost(
                                                post.post_id, 
                                                post.user_id, 
                                                post.description, 
                                                post.media_link,
                                                post.name
                                            )}
                                            disabled={isReposting}
                                            className="repost-button"
                                        >
                                            {isReposting ? (
                                                '...'
                                            ) : (
                                                <>
                                                    <BiRepost size={16} style={{ marginRight: '5px' }} /> 
                                                    {post.number_reposts || 0}
                                                </>
                                            )}
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
                                                                            onLoad={(e) => {
                                                                                e.target.style.width = '30px';
                                                                                e.target.style.height = '30px';
                                                                            }}
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