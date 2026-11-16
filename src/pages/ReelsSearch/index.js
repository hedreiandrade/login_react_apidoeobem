import React, { useState, useEffect, useRef, useCallback } from 'react';
import Footer from '../../components/Footer'; // Rodapé adicionado novamente
import { Alert, Button, Input, Spinner } from 'reactstrap';
import { apiFeed } from '../../services/api';
import '../../styles/ReelsSearch.css';
import { useExpireToken } from "../../hooks/expireToken";
import { getInitialsImage } from "../../ultils/initialsImage";
import { getVerifyToken } from "../../ultils/verifyToken";
import { Link, useLocation, useHistory } from 'react-router-dom';
import { AiFillHeart } from "react-icons/ai";
import { FaCommentDots, FaTimes, FaPlay} from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { RiVerifiedBadgeFill } from "react-icons/ri";

export default function ReelsSearchPage() {
    useExpireToken();
    const location = useLocation();
    const history = useHistory();

    // Recebe os posts do mural e o index clicado para renderização instantânea
    const initialPosts = location.state?.initialPosts || [];
    const startIndex = location.state?.startIndex || 0;

    // Estados Base
    const [reelsPosts, setReelsPosts] = useState(initialPosts);
    const [error, setError] = useState('');
    
    // Estados de Paginação/API
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);

    // Interaction states
    const [likingPosts, setLikingPosts] = useState({});
    const [commentingPosts, setCommentingPosts] = useState({});
    const [expandedComments, setExpandedComments] = useState({});
    const [commentsData, setCommentsData] = useState({});
    const [commentTexts, setCommentTexts] = useState({});
    const [commentsLoading, setCommentsLoading] = useState({});
    const [repostingPosts, setRepostingPosts] = useState({});

    // Follow states
    const [followStatuses, setFollowStatuses] = useState({});
    const [checkingFollowStatuses, setCheckingFollowStatuses] = useState({});
    const [followLoadingStates, setFollowLoadingStates] = useState({});

    // Video states
    const [pausedStates, setPausedStates] = useState({});
    const [mutedStates, setMutedStates] = useState({});

    const videoRefs = useRef({});
    const reelItemRefs = useRef({});
    const isMountedRef = useRef(true);
    const reelsObserver = useRef();

    // Comments refs
    const commentsLoadingRef = useRef({});
    const commentsDataRef = useRef({});
    const commentSentinelRefs = useRef({});

    const userId = parseInt(localStorage.getItem('user_id'));
    const token = localStorage.getItem('login_token');

    const isValidPhoto = useCallback((photo) => {
        return photo && photo.trim() !== '' && photo !== 'null' && photo !== 'undefined';
    }, []);

    useEffect(() => {
        commentsDataRef.current = commentsData;
    }, [commentsData]);

    // Verifica se a mídia é vídeo
    const isVideoMedia = (link) => {
        if (!link) return false;
        return link.match(/\.(mp4|webm|ogg|mov)$/i) || link.includes('video');
    };

    // ======================== FETCH API ========================
    const fetchMuralReels = useCallback(async (pageNum) => {
        if (loading) return;
        setLoading(true);
        try {
            const isValid = await getVerifyToken(token);
            if (!isValid && isMountedRef.current) { window.location.href = "/"; return; }

            const response = await apiFeed.get(`/searchMural/${pageNum}/12`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (isMountedRef.current && response.data && response.data.data) {
                setReelsPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.post_id));
                    const newPosts = response.data.data.filter(p => !existingIds.has(p.post_id));
                    return [...prev, ...newPosts];
                });

                if (pageNum >= (response.data.last_page || 1)) {
                    setHasMore(false);
                }
            }
        } catch (err) {
            if (isMountedRef.current) setError('Failed to load more posts');
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, [token, loading]);

    // Carrega a próxima página quando o scroll chega ao fim
    useEffect(() => {
        if (initialPosts.length > 0 && page === 1) {
            setPage(2); 
            return;
        }
        
        if (hasMore) {
            fetchMuralReels(page);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    // Observer para Infinite Scroll dos Reels
    const lastReelRef = useCallback(node => {
        if (loading || !hasMore) return;
        if (reelsObserver.current) reelsObserver.current.disconnect();

        requestAnimationFrame(() => {
            reelsObserver.current = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    setPage(prev => prev + 1);
                }
            }, { rootMargin: '400px', threshold: 0.1 });
            if (node) reelsObserver.current.observe(node);
        });
    }, [loading, hasMore]);

    // ======================== LIFECYCLE & PLAYER ========================
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // Função para pular para o post clicado (scroll inicial)
    useEffect(() => {
        if (startIndex > 0 && reelItemRefs.current[reelsPosts[startIndex]?.post_id]) {
            setTimeout(() => {
                reelItemRefs.current[reelsPosts[startIndex]?.post_id]?.scrollIntoView({ behavior: 'instant' });
            }, 100);
        }
    }, [startIndex, reelsPosts]);

    // Autoplay on visible
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const postId = entry.target.dataset.postId;
                const video = videoRefs.current[postId];
                if (!video) return;

                if (entry.isIntersecting) {
                    video.play().catch(() => {});
                    setPausedStates(prev => ({ ...prev, [postId]: false }));
                } else {
                    try { video.pause(); } catch (e) {}
                    video.currentTime = 0;
                }
            });
        }, { threshold: 0.6 });

        Object.values(reelItemRefs.current).forEach(el => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [reelsPosts]);

    const togglePlay = useCallback((postId) => {
        const video = videoRefs.current[postId];
        if (!video) return;
        if (video.paused) {
            video.play().catch(() => {});
            setPausedStates(prev => ({ ...prev, [postId]: false }));
        } else {
            video.pause();
            setPausedStates(prev => ({ ...prev, [postId]: true }));
        }
    }, []);

    const toggleMute = useCallback((postId) => {
        const video = videoRefs.current[postId];
        if (!video) return;
        video.muted = !video.muted;
        setMutedStates(prev => ({ ...prev, [postId]: video.muted }));
    }, []);

    // ======================== FOLLOW ========================
    const checkIsFollowed = useCallback(async (targetUserId) => {
        if (parseInt(targetUserId) === userId || checkingFollowStatuses[targetUserId] || followStatuses[targetUserId] !== undefined) return;
        setCheckingFollowStatuses(prev => ({ ...prev, [targetUserId]: true }));
        try {
            const response = await apiFeed.post('/isFollowed', { user_id: parseInt(targetUserId), follower_id: userId }, { headers: { Authorization: `Bearer ${token}` } });
            if (isMountedRef.current) setFollowStatuses(prev => ({ ...prev, [targetUserId]: !!response.data.is_followed }));
        } catch (err) {
            if (isMountedRef.current) setFollowStatuses(prev => ({ ...prev, [targetUserId]: false }));
        } finally {
            if (isMountedRef.current) setCheckingFollowStatuses(prev => ({ ...prev, [targetUserId]: false }));
        }
    }, [userId, token, checkingFollowStatuses, followStatuses]);

    const followUser = useCallback(async (targetUserId) => {
        setFollowLoadingStates(prev => ({ ...prev, [targetUserId]: true }));
        try {
            const response = await apiFeed.post('/follow', { user_id: parseInt(targetUserId), follower_id: userId }, { headers: { Authorization: `Bearer ${token}` } });
            if (isMountedRef.current && response.data.status !== 401) setFollowStatuses(prev => ({ ...prev, [targetUserId]: true }));
        } catch (err) { if (isMountedRef.current) setError('Failed to follow user'); } 
        finally { if (isMountedRef.current) setFollowLoadingStates(prev => ({ ...prev, [targetUserId]: false })); }
    }, [token, userId]);

    const unfollowUser = useCallback(async (targetUserId) => {
        setFollowLoadingStates(prev => ({ ...prev, [targetUserId]: true }));
        try {
            const response = await apiFeed.post('/unFollow', { user_id: parseInt(targetUserId), follower_id: userId }, { headers: { Authorization: `Bearer ${token}` } });
            if (isMountedRef.current && response.data.status !== 401) setFollowStatuses(prev => ({ ...prev, [targetUserId]: false }));
        } catch (err) { if (isMountedRef.current) setError('Failed to unfollow user'); } 
        finally { if (isMountedRef.current) setFollowLoadingStates(prev => ({ ...prev, [targetUserId]: false })); }
    }, [token, userId]);

    useEffect(() => {
        if (!reelsPosts.length) return;
        const uniqueUserIds = [...new Set(reelsPosts.map(p => (p.is_repost ? p.original_user_id : p.user_id)))];
        uniqueUserIds.forEach(uid => {
            if (parseInt(uid) !== userId && followStatuses[uid] === undefined && !checkingFollowStatuses[uid]) {
                checkIsFollowed(uid);
            }
        });
    }, [reelsPosts, userId, followStatuses, checkingFollowStatuses, checkIsFollowed]);

    // ======================== ACTIONS ========================
    const handleLike = useCallback(async (postId, currentLikes, isCurrentlyLiked) => {
        if (likingPosts[postId]) return;
        setLikingPosts(prev => ({ ...prev, [postId]: true }));
        try {
            const endpoint = isCurrentlyLiked ? '/unLike' : '/like';
            const response = await apiFeed.post(endpoint, { post_id: postId, user_id: userId }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
            if (isMountedRef.current && response.data.status !== 401) {
                setReelsPosts(prev => prev.map(post => post.post_id === postId ? { ...post, number_likes: isCurrentlyLiked ? currentLikes - 1 : currentLikes + 1, user_has_liked: !isCurrentlyLiked } : post));
            }
        } catch (err) { if (isMountedRef.current) setError('Failed to like'); } 
        finally { if (isMountedRef.current) setLikingPosts(prev => ({ ...prev, [postId]: false })); }
    }, [token, likingPosts, userId]);

    const handleRepost = useCallback(async (originalPostId, originalUserId, originalDescription, originalMediaLink) => {
        if (repostingPosts[originalPostId]) return;
        setRepostingPosts(prev => ({ ...prev, [originalPostId]: true }));
        try {
            const repostData = { user_id: userId, description: originalDescription, media_link: originalMediaLink, is_repost: true, original_user_id: originalUserId, original_post_id: originalPostId };
            const response = await apiFeed.post('/rePosts', repostData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
            if (isMountedRef.current && response.data.status !== 401) {
                setReelsPosts(prev => prev.map(post => post.post_id === originalPostId ? { ...post, number_reposts: (post.number_reposts || 0) + 1 } : post));
            }
        } catch (err) { if (isMountedRef.current) setError('Failed to repost'); } 
        finally { if (isMountedRef.current) setRepostingPosts(prev => ({ ...prev, [originalPostId]: false })); }
    }, [token, repostingPosts, userId]);

    // Comments logic
    const fetchComments = useCallback(async (postId, pageNum = 1) => {
        if (commentsLoadingRef.current[postId]) return;
        commentsLoadingRef.current[postId] = true;
        setCommentsLoading(prev => ({ ...prev, [postId]: true }));
        try {
            const response = await apiFeed.get(`/comments/${userId}/${postId}/${pageNum}/5`, { headers: { Authorization: `Bearer ${token}` } });
            if (isMountedRef.current) {
                setCommentsData(prev => ({
                    ...prev,
                    [postId]: {
                        data: pageNum === 1 ? response.data.data || [] : [...(prev[postId]?.data || []), ...(response.data.data || [])],
                        currentPage: pageNum, lastPage: response.data.last_page, hasMore: pageNum < response.data.last_page
                    }
                }));
            }
        } catch (err) { if (isMountedRef.current) setError('Failed to load comments'); } 
        finally { commentsLoadingRef.current[postId] = false; if (isMountedRef.current) setCommentsLoading(prev => ({ ...prev, [postId]: false })); }
    }, [token, userId]);

    const toggleComments = useCallback(async (postId) => {
        if (expandedComments[postId]) setExpandedComments(prev => ({ ...prev, [postId]: false }));
        else { setExpandedComments(prev => ({ ...prev, [postId]: true })); await fetchComments(postId, 1); }
    }, [expandedComments, fetchComments]);

    const handleAddComment = useCallback(async (postId) => {
        const commentText = commentTexts[postId] || '';
        if (!commentText.trim()) return;
        setCommentingPosts(prev => ({ ...prev, [postId]: true }));
        try {
            const response = await apiFeed.post('/comments', { post_id: postId, user_id: userId, comment: commentText }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
            if (isMountedRef.current && response.data.status !== 401) {
                await fetchComments(postId, 1);
                setCommentTexts(prev => ({ ...prev, [postId]: '' }));
                setReelsPosts(prev => prev.map(post => post.post_id === postId ? { ...post, number_comments: (post.number_comments || 0) + 1 } : post));
            }
        } catch (err) { if (isMountedRef.current) setError('Failed to comment'); } 
        finally { if (isMountedRef.current) setCommentingPosts(prev => ({ ...prev, [postId]: false })); }
    }, [token, commentTexts, fetchComments, userId]);

    // ---------- Auto-load próxima página de comentários (Sentinela) ----------
    useEffect(() => {
        if (Object.keys(commentsData).length === 0) return;

        const checkSentinels = () => {
            Object.entries(commentSentinelRefs.current).forEach(([postIdStr, node]) => {
                if (!node) return;
                const postId = parseInt(postIdStr, 10);
                const meta = commentsDataRef.current[postId];
                if (!meta?.hasMore) return;
                if (commentsLoadingRef.current[postId]) return;

                const rect = node.getBoundingClientRect();
                const isVisible = rect.top < window.innerHeight + 200 && rect.bottom > -200;
                if (isVisible) {
                    fetchComments(postId, (meta.currentPage || 1) + 1);
                }
            });
        };

        const t = setTimeout(checkSentinels, 100);

        document.addEventListener('scroll', checkSentinels, true);
        window.addEventListener('resize', checkSentinels);
        return () => {
            clearTimeout(t);
            document.removeEventListener('scroll', checkSentinels, true);
            window.removeEventListener('resize', checkSentinels);
        };
    }, [commentsData, fetchComments]);

    const renderFollowButton = useCallback((targetUserId) => {
        if (parseInt(targetUserId) === userId) return null;
        if (checkingFollowStatuses[targetUserId]) return <button className="reel-follow-btn" disabled>Loading...</button>;
        if (followLoadingStates[targetUserId]) return <button className="reel-follow-btn" disabled>{followStatuses[targetUserId] ? 'Unfollowing...' : 'Following...'}</button>;
        if (followStatuses[targetUserId]) return <button className="reel-follow-btn reel-following-btn" onClick={() => unfollowUser(targetUserId)}>Following</button>;
        return <button className="reel-follow-btn reel-follow-primary-btn" onClick={() => followUser(targetUserId)}>Follow</button>;
    }, [userId, checkingFollowStatuses, followLoadingStates, followStatuses, followUser, unfollowUser]);

    if (!reelsPosts || reelsPosts.length === 0) {
        return (
            <div className="reels-page d-flex flex-column justify-content-center align-items-center">
                <Spinner color="light" />
                <p className="text-white mt-3">Carregando...</p>
                <Button color="primary" className="mt-3" onClick={() => history.push('/search')}>Voltar</Button>
            </div>
        );
    }

    return (
        <div className="reels-page">
            <div className="reels-header-overlay">
                <Button color="link" className="text-white" onClick={() => history.push('/search')}>
                    <FaTimes size={24} />
                </Button>
            </div>

            <div className="reels-container">
                {error && <Alert color="danger" fade={false} className="reels-alert">{error}</Alert>}

                {reelsPosts.map((post, index) => {
                    const isLast = index === reelsPosts.length - 1;
                    const isRepost = post.is_repost === true || post.is_repost === 1;
                    const displayUserId = isRepost ? post.original_user_id : post.user_id;
                    const displayName = isRepost ? post.original_user_name : post.name;
                    const displayPhoto = isRepost ? post.original_user_photo : post.photo;
                    const photo = isValidPhoto(displayPhoto) ? displayPhoto : getInitialsImage(displayName);

                    const hasLiked = post.user_has_liked === 1 || post.user_has_liked === true;
                    const isLiking = likingPosts[post.post_id] || false;
                    const isCommenting = commentingPosts[post.post_id] || false;
                    const isCommentsExpanded = expandedComments[post.post_id] || false;
                    const postComments = commentsData[post.post_id]?.data || [];
                    const currentCommentText = commentTexts[post.post_id] || '';
                    const isCommentsLoading = commentsLoading[post.post_id] || false;
                    const isReposting = repostingPosts[post.post_id] || false;
                    const isPaused = pausedStates[post.post_id] || false;
                    const isMuted = mutedStates[post.post_id] !== false;
                    const isVerifiedAuthor = isRepost ? (post.original_verified_profile === true) : (post.verified_profile === true);
                    const commentsHasMore = commentsData[post.post_id]?.hasMore || false;

                    const isVideo = isVideoMedia(post.media_link);

                    return (
                        <div
                            key={post.post_id}
                            ref={el => { 
                                reelItemRefs.current[post.post_id] = el; 
                                if (isLast && lastReelRef) lastReelRef(el);
                            }}
                            className="reel-item"
                            data-post-id={post.post_id}
                        >
                            {/* Renderização Condicional: Vídeo ou Imagem */}
                            {isVideo ? (
                                <>
                                    <video
                                        ref={el => { videoRefs.current[post.post_id] = el; }}
                                        src={post.media_link}
                                        className="reel-media"
                                        loop playsInline muted autoPlay preload="metadata"
                                        onClick={() => togglePlay(post.post_id)}
                                    />
                                    {isPaused && (
                                        <div className="reel-play-overlay" onClick={() => togglePlay(post.post_id)}>
                                            <FaPlay size={70} color="rgba(255,255,255,0.85)" />
                                        </div>
                                    )}
                                    <button className="reel-mute-btn" onClick={() => toggleMute(post.post_id)}>
                                        {isMuted ? '🔇' : '🔊'}
                                    </button>
                                </>
                            ) : (
                                <img src={post.media_link} className="reel-media" alt="Post" />
                            )}

                            <div className="reel-actions">
                                <button className="reel-action-btn" onClick={() => handleLike(post.post_id, post.number_likes, hasLiked)} disabled={isLiking}>
                                    <AiFillHeart size={32} color={hasLiked ? '#ed4956' : '#ffffff'} />
                                    <span className="reel-action-count">{post.number_likes || 0}</span>
                                </button>

                                <button className="reel-action-btn" onClick={() => toggleComments(post.post_id)}>
                                    <FaCommentDots size={30} color="#ffffff" />
                                    <span className="reel-action-count">{post.number_comments || 0}</span>
                                </button>

                                <button className="reel-action-btn" onClick={() => handleRepost(post.post_id, post.original_user_id || post.user_id, post.description, post.media_link)} disabled={isReposting}>
                                    <BiRepost size={34} color="#ffffff" />
                                    <span className="reel-action-count">{post.number_reposts || 0}</span>
                                </button>
                            </div>

                            <div className="reel-info">
                                {isRepost && (
                                    <div className="reel-repost-indicator">
                                        <BiRepost size={14} style={{ marginRight: '5px' }} />
                                        <small>
                                            <strong>{post.name}</strong>
                                            {post.verified_profile === true && <RiVerifiedBadgeFill className="verified-badge" size={14} />}
                                            {' '}reposted
                                        </small>
                                    </div>
                                )}

                                <div className="reel-user-row">
                                    <Link to={`/profile/${displayUserId}`}>
                                        <img src={photo} alt={displayName} className="reel-user-photo" />
                                    </Link>

                                    <strong className="reel-username">
                                        <span className="reel-username-text">{displayName}</span>
                                        {isVerifiedAuthor && <RiVerifiedBadgeFill className="verified-badge reel-verified-badge" size={14} />}
                                    </strong>

                                    {renderFollowButton(displayUserId)}
                                </div>

                                {post.description && <p className="reel-description">{post.description}</p>}
                            </div>

                            {isCommentsExpanded && (
                                <div className="reel-comments-overlay" onClick={(e) => e.stopPropagation()}>
                                    <div className="reel-comments-header">
                                        <span>Comments</span>
                                        <button className="reel-comments-close" onClick={() => toggleComments(post.post_id)}>
                                            <FaTimes />
                                        </button>
                                    </div>

                                    <div className="reel-comments-list">
                                        {isCommentsLoading && postComments.length === 0 ? (
                                            <p className="reel-comments-empty">Loading...</p>
                                        ) : postComments.length > 0 ? (
                                            <>
                                                {postComments.map((comment) => (
                                                    <div key={comment.id} className="reel-comment-item">
                                                        <Link to={`/profile/${comment.user_id}`}>
                                                            <img src={isValidPhoto(comment.photo) ? comment.photo : getInitialsImage(comment.name)} alt={comment.name} className="reel-comment-photo" />
                                                        </Link>
                                                        <div className="reel-comment-content">
                                                            <strong className="reel-comment-name">
                                                                {comment.name}
                                                                {comment.verified_profile === true && <RiVerifiedBadgeFill className="verified-badge reel-verified-badge" size={12} />}
                                                            </strong>
                                                            <p className="reel-comment-text">{comment.comment}</p>
                                                            <small className="reel-comment-date">{new Date(comment.created_at).toLocaleString()}</small>
                                                        </div>
                                                    </div>
                                                ))}
                                                
                                                {commentsHasMore && (
                                                    <div
                                                        ref={el => { commentSentinelRefs.current[post.post_id] = el; }}
                                                        className="reel-comments-sentinel"
                                                        style={{ height: 20, width: '100%' }}
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </>
                                        ) : (
                                            <p className="reel-comments-empty">No comments yet</p>
                                        )}
                                    </div>

                                    <div className="reel-comment-form">
                                        <Input
                                            type="textarea"
                                            value={currentCommentText}
                                            onChange={e => setCommentTexts(prev => ({ ...prev, [post.post_id]: e.target.value }))}
                                            placeholder="Add a comment..."
                                            rows="1"
                                            className="reel-comment-input"
                                        />
                                        <Button color="primary" size="sm" onClick={() => handleAddComment(post.post_id)} disabled={!currentCommentText.trim() || isCommenting} className="reel-comment-submit">
                                            {isCommenting ? '...' : 'Post'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                
                {loading && (
                    <div className="reel-loading-spinner">
                        <Spinner color="light" />
                    </div>
                )}
            </div>

            {/* Rodapé adicionado */}
            <Footer showOnScroll={true} />
        </div>
    );
}