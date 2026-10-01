import React, { useState, useEffect, useRef, useCallback } from 'react';
import Footer from '../../components/Footer';
import SocialHeaderReels from '../../components/SocialHeaderReels';
import { Alert, Button, Input } from 'reactstrap';
import { apiFeed } from '../../services/api';
import '../../styles/Reels.css';
import { useExpireToken } from "../../hooks/expireToken";
import { getInitialsImage } from "../../ultils/initialsImage";
import { getVerifyToken } from "../../ultils/verifyToken";
import { Link } from 'react-router-dom';
import { AiFillHeart } from "react-icons/ai";
import { FaCommentDots, FaTimes, FaPlay } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";

export default function ReelsPage() {
    useExpireToken();

    // Reels state
    const [reelsPosts, setReelsPosts] = useState([]);
    const [reelsPage, setReelsPage] = useState(1);
    const [reelsHasMore, setReelsHasMore] = useState(true);
    const [reelsLoading, setReelsLoading] = useState(false);
    const [error, setError] = useState('');

    // Interaction states
    const [likingPosts, setLikingPosts] = useState({});
    const [commentingPosts, setCommentingPosts] = useState({});
    const [expandedComments, setExpandedComments] = useState({});
    const [commentsData, setCommentsData] = useState({});
    const [commentTexts, setCommentTexts] = useState({});
    const [commentsLoading, setCommentsLoading] = useState({});
    const [repostingPosts, setRepostingPosts] = useState({});

    // Follow states (por user_id)
    const [followStatuses, setFollowStatuses] = useState({});
    const [checkingFollowStatuses, setCheckingFollowStatuses] = useState({});
    const [followLoadingStates, setFollowLoadingStates] = useState({});

    // Video states
    const [pausedStates, setPausedStates] = useState({});
    const [mutedStates, setMutedStates] = useState({});

    const reelsObserver = useRef();
    const videoRefs = useRef({});
    const reelItemRefs = useRef({});
    const isMountedRef = useRef(true);

    // Guarda síncrona para evitar chamadas concorrentes de fetchComments
    const commentsLoadingRef = useRef({});
    // Espelho de commentsData para o scroll handler ler sempre o estado mais recente
    const commentsDataRef = useRef({});
    // Sentinelas (um por post) para o auto-load da próxima página de comentários
    const commentSentinelRefs = useRef({});

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

    // Mantém commentsDataRef sincronizado
    useEffect(() => {
        commentsDataRef.current = commentsData;
    }, [commentsData]);

    // ---------- Text with clickable links ----------
    const formatTextWithLinks = useCallback((text) => {
        if (!text || typeof text !== 'string') return text;

        const urlRegex = /(\b(https?:\/\/|www\.)[^\s]+|\b[\w.-]+\.(com|org|net|br|io|co|info|edu|gov|me|dev|app)[^\s]*)/gi;

        const parts = [];
        let lastIndex = 0;
        let match;

        const regex = new RegExp(urlRegex.source, urlRegex.flags);
        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(text.substring(lastIndex, match.index));
            }

            const url = match[0];
            let displayUrl = url;
            let href = url;

            if (url.startsWith('www.')) {
                href = `https://${url}`;
            } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
                href = `https://${url}`;
            }

            const punctuationRegex = /[.,;!?]+$/;
            const punctuationMatch = punctuationRegex.exec(url);

            if (punctuationMatch) {
                const cleanUrl = url.substring(0, punctuationMatch.index);
                const punctuation = punctuationMatch[0];

                if (cleanUrl.startsWith('www.')) {
                    href = `https://${cleanUrl}`;
                } else if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                    href = `https://${cleanUrl}`;
                }

                parts.push(
                    <a
                        key={`${match.index}-link`}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="reel-text-link"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {cleanUrl}
                    </a>
                );
                parts.push(punctuation);
            } else {
                parts.push(
                    <a
                        key={`${match.index}-link`}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="reel-text-link"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {displayUrl}
                    </a>
                );
            }

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
        }

        return parts.length === 0 ? text : parts;
    }, []);

    // ---------- Fetch Reels ----------
    const fetchReels = useCallback(async (pageNum = reelsPage) => {
        if (isMountedRef.current) setReelsLoading(true);
        if (isMountedRef.current) setError('');

        try {
            const isValid = await getVerifyToken(token);
            if (!isValid && isMountedRef.current) {
                window.location.href = "/";
                return;
            }

            const response = await apiFeed.get(`/verticalReels/${userId}/${pageNum}/5`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (isMountedRef.current && response.data.data.length > 0) {
                setReelsPosts(prev => {
                    const existingIds = new Set(prev.map(post => post.post_id));
                    const newPosts = response.data.data.filter(post => !existingIds.has(post.post_id));
                    return [...prev, ...newPosts];
                });
            }

            if (isMountedRef.current && pageNum >= response.data.last_page) {
                setReelsHasMore(false);
            }
        } catch (err) {
            if (isMountedRef.current) {
                if (err.response?.status === 401) {
                    window.location.href = "/";
                    return;
                }
                setError('Failed to load reels');
            }
        } finally {
            if (isMountedRef.current) setReelsLoading(false);
        }
    }, [token, reelsPage, userId]);

    // ---------- Lifecycle ----------
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (reelsHasMore) {
            fetchReels(reelsPage);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reelsPage, reelsHasMore]);

    // ---------- Infinite scroll ----------
    const lastReelsPostRef = useCallback(node => {
        if (reelsLoading) return;
        if (reelsObserver.current) reelsObserver.current.disconnect();

        requestAnimationFrame(() => {
            reelsObserver.current = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting && reelsHasMore && isMountedRef.current) {
                    setReelsPage(prevPage => prevPage + 1);
                }
            }, {
                rootMargin: '300px',
                threshold: 0.1
            });

            if (node) reelsObserver.current.observe(node);
        });
    }, [reelsLoading, reelsHasMore]);

    // ---------- Autoplay on visible ----------
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

    // ---------- Video controls ----------
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
        if (parseInt(targetUserId) === userId) return;
        if (checkingFollowStatuses[targetUserId]) return;
        if (followStatuses[targetUserId] !== undefined) return;

        setCheckingFollowStatuses(prev => ({ ...prev, [targetUserId]: true }));

        try {
            const response = await apiFeed.post('/isFollowed', {
                user_id: parseInt(targetUserId),
                follower_id: userId
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (isMountedRef.current) {
                setFollowStatuses(prev => ({
                    ...prev,
                    [targetUserId]: !!response.data.is_followed
                }));
            }
        } catch (err) {
            console.error('Error checking follow status:', err);
            if (isMountedRef.current) {
                setFollowStatuses(prev => ({ ...prev, [targetUserId]: false }));
            }
        } finally {
            if (isMountedRef.current) {
                setCheckingFollowStatuses(prev => ({ ...prev, [targetUserId]: false }));
            }
        }
    }, [userId, token, checkingFollowStatuses, followStatuses]);

    const followUser = useCallback(async (targetUserId) => {
        setFollowLoadingStates(prev => ({ ...prev, [targetUserId]: true }));
        try {
            const isValid = await getVerifyToken(token);
            if (!isValid && isMountedRef.current) {
                window.location.href = "/";
                return;
            }

            const response = await apiFeed.post('/follow', {
                user_id: parseInt(targetUserId),
                follower_id: userId
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (isMountedRef.current) {
                if (response.data.status === 401) {
                    setError(response.data.response || 'Failed to follow user');
                } else {
                    setFollowStatuses(prev => ({ ...prev, [targetUserId]: true }));
                }
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError('Failed to follow user');
            }
        } finally {
            if (isMountedRef.current) {
                setFollowLoadingStates(prev => ({ ...prev, [targetUserId]: false }));
            }
        }
    }, [token, userId]);

    const unfollowUser = useCallback(async (targetUserId) => {
        setFollowLoadingStates(prev => ({ ...prev, [targetUserId]: true }));
        try {
            const isValid = await getVerifyToken(token);
            if (!isValid && isMountedRef.current) {
                window.location.href = "/";
                return;
            }

            const response = await apiFeed.post('/unFollow', {
                user_id: parseInt(targetUserId),
                follower_id: userId
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (isMountedRef.current) {
                if (response.data.status === 401) {
                    setError(response.data.response || 'Failed to unfollow user');
                } else {
                    setFollowStatuses(prev => ({ ...prev, [targetUserId]: false }));
                }
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError('Failed to unfollow user');
            }
        } finally {
            if (isMountedRef.current) {
                setFollowLoadingStates(prev => ({ ...prev, [targetUserId]: false }));
            }
        }
    }, [token, userId]);

    // Verifica follow status para novos usuários que aparecerem no feed
    useEffect(() => {
        if (!reelsPosts.length) return;

        const uniqueUserIds = [...new Set(reelsPosts.map(p => p.user_id))];

        uniqueUserIds.forEach(uid => {
            if (
                parseInt(uid) !== userId &&
                followStatuses[uid] === undefined &&
                !checkingFollowStatuses[uid]
            ) {
                checkIsFollowed(uid);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reelsPosts, userId]);

    // ---------- Handlers ----------
    const handleLike = useCallback(async (postId, currentLikes, isCurrentlyLiked) => {
        if (likingPosts[postId]) return;
        setLikingPosts(prev => ({ ...prev, [postId]: true }));

        try {
            const isValid = await getVerifyToken(token);
            if (!isValid && isMountedRef.current) {
                window.location.href = "/";
                return;
            }

            const endpoint = isCurrentlyLiked ? '/unLike' : '/like';
            const data = { post_id: postId, user_id: userId };

            const response = await apiFeed.post(endpoint, data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (isMountedRef.current) {
                if (response.data.status === 401) {
                    setError(`Failed to ${isCurrentlyLiked ? 'unlike' : 'like'} reel`);
                } else {
                    setReelsPosts(prev =>
                        prev.map(post =>
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
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError(`Failed to ${isCurrentlyLiked ? 'unlike' : 'like'} reel`);
            }
        } finally {
            if (isMountedRef.current) {
                setLikingPosts(prev => ({ ...prev, [postId]: false }));
            }
        }
    }, [token, likingPosts, userId]);

    const handleRepost = useCallback(async (originalPostId, originalUserId, originalDescription, originalMediaLink) => {
        if (repostingPosts[originalPostId]) return;
        setRepostingPosts(prev => ({ ...prev, [originalPostId]: true }));

        try {
            const isValid = await getVerifyToken(token);
            if (!isValid && isMountedRef.current) {
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

            if (isMountedRef.current) {
                if (response.data.status === 401) {
                    setError(response.data.error);
                } else {
                    setReelsPosts(prev =>
                        prev.map(post =>
                            post.post_id === originalPostId
                                ? { ...post, number_reposts: (post.number_reposts || 0) + 1 }
                                : post
                        )
                    );
                }
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError('Failed to repost');
            }
        } finally {
            if (isMountedRef.current) {
                setRepostingPosts(prev => ({ ...prev, [originalPostId]: false }));
            }
        }
    }, [token, repostingPosts, userId]);

    const handleDeletePost = useCallback(async (postId) => {
        try {
            const isValid = await getVerifyToken(token);
            if (!isValid && isMountedRef.current) {
                window.location.href = "/";
                return;
            }
            const response = await apiFeed.delete(`/posts/${postId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (isMountedRef.current) {
                if (response.data.status === 401) {
                    setError('Failed to delete reel');
                } else {
                    setReelsPosts(prev => prev.filter(post => post.post_id !== postId));
                }
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError('Failed to delete reel');
            }
        }
    }, [token]);

    // ---------- Comments ----------
    const fetchComments = useCallback(async (postId, pageNum = 1) => {
        if (commentsLoadingRef.current[postId]) return;
        commentsLoadingRef.current[postId] = true;
        setCommentsLoading(prev => ({ ...prev, [postId]: true }));

        try {
            const isValid = await getVerifyToken(token);
            if (!isValid && isMountedRef.current) {
                window.location.href = "/";
                return;
            }

            const response = await apiFeed.get(`/comments/${postId}/${pageNum}/5`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (isMountedRef.current) {
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
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError('Failed to load comments');
            }
        } finally {
            commentsLoadingRef.current[postId] = false;
            if (isMountedRef.current) {
                setCommentsLoading(prev => ({ ...prev, [postId]: false }));
            }
        }
    }, [token]);

    const toggleComments = useCallback(async (postId) => {
        if (expandedComments[postId]) {
            setExpandedComments(prev => ({ ...prev, [postId]: false }));
        } else {
            setExpandedComments(prev => ({ ...prev, [postId]: true }));
            await fetchComments(postId, 1);
        }
    }, [expandedComments, fetchComments]);

    const handleAddComment = useCallback(async (postId) => {
        const commentText = commentTexts[postId] || '';
        if (!commentText.trim()) return;
        setCommentingPosts(prev => ({ ...prev, [postId]: true }));

        try {
            const isValid = await getVerifyToken(token);
            if (!isValid && isMountedRef.current) {
                window.location.href = "/";
                return;
            }

            const data = { post_id: postId, user_id: userId, comment: commentText };

            const response = await apiFeed.post('/comments', data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (isMountedRef.current) {
                if (response.data.status === 401) {
                    setError('Failed to comment on reel');
                } else {
                    await fetchComments(postId, 1);
                    setCommentTexts(prev => ({ ...prev, [postId]: '' }));
                    setReelsPosts(prev =>
                        prev.map(post =>
                            post.post_id === postId
                                ? { ...post, number_comments: (post.number_comments || 0) + 1 }
                                : post
                        )
                    );
                }
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError('Failed to comment on reel');
            }
        } finally {
            if (isMountedRef.current) {
                setCommentingPosts(prev => ({ ...prev, [postId]: false }));
            }
        }
    }, [token, commentTexts, fetchComments, userId]);

    const handleDeleteComment = useCallback(async (postId, commentId) => {
        try {
            const isValid = await getVerifyToken(token);
            if (!isValid && isMountedRef.current) {
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

            if (isMountedRef.current) {
                if (response.data.status === 401) {
                    setError('Failed to delete comment');
                } else {
                    setCommentsData(prev => ({
                        ...prev,
                        [postId]: {
                            ...prev[postId],
                            data: prev[postId]?.data?.filter(c => c.id !== commentId) || []
                        }
                    }));
                    setReelsPosts(prev =>
                        prev.map(post =>
                            post.post_id === postId
                                ? { ...post, number_comments: Math.max(0, (post.number_comments || 1) - 1) }
                                : post
                        )
                    );
                }
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError('Failed to delete comment');
            }
        }
    }, [token, userId]);

    const handleCommentTextChange = useCallback((postId, text) => {
        setCommentTexts(prev => ({ ...prev, [postId]: text }));
    }, []);

    // ---------- Auto-load próxima página de comentários ----------
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
                const isVisible =
                    rect.top < window.innerHeight + 200 && rect.bottom > -200;
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

    // ---------- Follow Button Renderer ----------
    const renderFollowButton = useCallback((targetUserId) => {
        if (parseInt(targetUserId) === userId) return null;

        const isChecking = checkingFollowStatuses[targetUserId];
        const isLoading = followLoadingStates[targetUserId];
        const isFollowed = followStatuses[targetUserId];

        if (isChecking) {
            return (
                <button className="reel-follow-btn" disabled>
                    Loading...
                </button>
            );
        }

        if (isLoading) {
            return (
                <button className="reel-follow-btn" disabled>
                    {isFollowed ? 'Unfollowing...' : 'Following...'}
                </button>
            );
        }

        if (isFollowed) {
            return (
                <button
                    className="reel-follow-btn reel-following-btn"
                    onClick={() => unfollowUser(targetUserId)}
                >
                    Following
                </button>
            );
        }

        return (
            <button
                className="reel-follow-btn reel-follow-primary-btn"
                onClick={() => followUser(targetUserId)}
            >
                Follow
            </button>
        );
    }, [userId, checkingFollowStatuses, followLoadingStates, followStatuses, followUser, unfollowUser]);

    // ---------- Render ----------
    return (
        <div className="reels-page">
            <SocialHeaderReels user={user} />

            <div className="reels-container">
                {error && (
                    <Alert color="danger" fade={false} className="reels-alert">
                        {error}
                    </Alert>
                )}

                {reelsPosts.map((post, index) => {
                    const isLast = index === reelsPosts.length - 1;
                    const photo = isValidPhoto(post.photo)
                        ? post.photo
                        : getInitialsImage(post.name);

                    const hasLiked = post.user_has_liked === 1 || post.user_has_liked === true;
                    const isLiking = likingPosts[post.post_id] || false;
                    const isCommenting = commentingPosts[post.post_id] || false;
                    const isCommentsExpanded = expandedComments[post.post_id] || false;
                    const postComments = commentsData[post.post_id]?.data || [];
                    const currentCommentText = commentTexts[post.post_id] || '';
                    const isCommentsLoading = commentsLoading[post.post_id] || false;
                    const isReposting = repostingPosts[post.post_id] || false;
                    const isPaused = pausedStates[post.post_id] || false;
                    const isMuted = mutedStates[post.post_id] !== false; // padrão mutado
                    const isPostOwner = parseInt(post.user_id) === userId;

                    const commentsHasMore = commentsData[post.post_id]?.hasMore || false;

                    return (
                        <div
                            key={post.post_id}
                            ref={el => {
                                reelItemRefs.current[post.post_id] = el;
                                if (isLast && lastReelsPostRef) lastReelsPostRef(el);
                            }}
                            className="reel-item"
                            data-post-id={post.post_id}
                            data-index={index}
                        >
                            {/* Vídeo */}
                            <video
                                ref={el => { videoRefs.current[post.post_id] = el; }}
                                src={post.media_link}
                                className="reel-video"
                                loop
                                playsInline
                                muted
                                autoPlay
                                preload="metadata"
                                onClick={() => togglePlay(post.post_id)}
                            />

                            {/* Overlay de play quando pausado */}
                            {isPaused && (
                                <div className="reel-play-overlay" onClick={() => togglePlay(post.post_id)}>
                                    <FaPlay size={70} color="rgba(255,255,255,0.85)" />
                                </div>
                            )}

                            {/* Botão de mudo */}
                            <button
                                className="reel-mute-btn"
                                onClick={() => toggleMute(post.post_id)}
                                title={isMuted ? 'Unmute' : 'Mute'}
                            >
                                {isMuted ? '🔇' : '🔊'}
                            </button>

                            {/* Botão de deletar do dono */}
                            {isPostOwner && (
                                <button
                                    className="reel-owner-delete"
                                    onClick={() => handleDeletePost(post.post_id)}
                                    title="Delete reel"
                                >
                                    ×
                                </button>
                            )}

                            {/* Ações laterais direitas */}
                            <div className="reel-actions">
                                <button
                                    className="reel-action-btn"
                                    onClick={() => handleLike(post.post_id, post.number_likes, hasLiked)}
                                    disabled={isLiking}
                                >
                                    <AiFillHeart
                                        size={32}
                                        color={hasLiked ? '#ed4956' : '#ffffff'}
                                    />
                                    <span className="reel-action-count">
                                        {post.number_likes || 0}
                                    </span>
                                </button>

                                <button
                                    className="reel-action-btn"
                                    onClick={() => toggleComments(post.post_id)}
                                >
                                    <FaCommentDots size={30} color="#ffffff" />
                                    <span className="reel-action-count">
                                        {post.number_comments || 0}
                                    </span>
                                </button>

                                <button
                                    className="reel-action-btn"
                                    onClick={() => handleRepost(
                                        post.post_id,
                                        post.original_user_id || post.user_id,
                                        post.description,
                                        post.media_link
                                    )}
                                    disabled={isReposting}
                                >
                                    <BiRepost size={34} color="#ffffff" />
                                    <span className="reel-action-count">
                                        {post.number_reposts || 0}
                                    </span>
                                </button>
                            </div>

                            {/* Info inferior */}
                            <div className="reel-info">
                                <div className="reel-user-row">
                                    <Link to={`/profile/${post.user_id}`}>
                                        <img
                                            src={photo}
                                            alt={post.name}
                                            className="reel-user-photo"
                                            onError={(e) => {
                                                e.target.src = getInitialsImage(post.name);
                                            }}
                                        />
                                    </Link>
                                    <strong className="reel-username">{post.name}</strong>

                                    {/* Botão Follow / Following */}
                                    {renderFollowButton(post.user_id)}
                                </div>

                                {post.description && (
                                    <p className="reel-description">
                                        {formatTextWithLinks(post.description)}
                                    </p>
                                )}
                            </div>

                            {/* Overlay de comentários */}
                            {isCommentsExpanded && (
                                <div className="reel-comments-overlay" onClick={(e) => e.stopPropagation()}>
                                    <div className="reel-comments-header">
                                        <span>Comments</span>
                                        <button
                                            className="reel-comments-close"
                                            onClick={() => toggleComments(post.post_id)}
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>

                                    <div className="reel-comments-list">
                                        {isCommentsLoading && postComments.length === 0 ? (
                                            <p className="reel-comments-empty">Loading...</p>
                                        ) : postComments.length > 0 ? (
                                            <>
                                                {postComments.map((comment) => {
                                                    const commentUserPhoto = isValidPhoto(comment.photo)
                                                        ? comment.photo
                                                        : getInitialsImage(comment.name);

                                                    return (
                                                        <div key={comment.id} className="reel-comment-item">
                                                            <Link to={`/profile/${comment.user_id}`}>
                                                                <img
                                                                    src={commentUserPhoto}
                                                                    alt={comment.name}
                                                                    className="reel-comment-photo"
                                                                    onError={(e) => {
                                                                        e.target.src = getInitialsImage(comment.name);
                                                                    }}
                                                                />
                                                            </Link>
                                                            <div className="reel-comment-content">
                                                                <strong className="reel-comment-name">{comment.name}</strong>
                                                                <p className="reel-comment-text">
                                                                    {formatTextWithLinks(comment.comment)}
                                                                </p>
                                                                <small className="reel-comment-date">
                                                                    {new Date(comment.created_at).toLocaleString()}
                                                                </small>
                                                            </div>
                                                            {(parseInt(comment.user_id) === userId || parseInt(post.user_id) === userId) && (
                                                                <button
                                                                    className="reel-comment-delete"
                                                                    onClick={() => handleDeleteComment(post.post_id, comment.id)}
                                                                    title="Delete comment"
                                                                >
                                                                    ×
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* Sentinela: dispara o carregamento automático da próxima página */}
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
                                            onChange={e => handleCommentTextChange(post.post_id, e.target.value)}
                                            placeholder="Add a comment..."
                                            rows="1"
                                            className="reel-comment-input"
                                        />
                                        <Button
                                            color="primary"
                                            size="sm"
                                            onClick={() => handleAddComment(post.post_id)}
                                            disabled={!currentCommentText.trim() || isCommenting}
                                            className="reel-comment-submit"
                                        >
                                            {isCommenting ? '...' : 'Post'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {reelsLoading && (
                    <div className="reels-loading">Loading...</div>
                )}

                {!reelsHasMore && reelsPosts.length > 0 && (
                    <div className="reels-end">No more reels</div>
                )}
            </div>

            <Footer showOnScroll={true} />
        </div>
    );
}