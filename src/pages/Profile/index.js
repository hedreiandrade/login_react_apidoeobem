import React, { useState, useEffect, useRef, useCallback } from 'react';
import Footer from '../../components/Footer';
import SocialHeader from '../../components/SocialHeader';
import { Alert, Button } from 'reactstrap';
import { apiFeed, api } from '../../services/api';
import '../../styles/Profile.css';
import { useExpireToken } from "../../hooks/expireToken";
import { getInitialsImage } from "../../ultils/initialsImage";
import { getVerifyToken } from "../../ultils/verifyToken";
import { useParams, Link } from 'react-router-dom';
import { AiFillHeart } from "react-icons/ai";
import { FaTrash, FaCommentDots, FaCamera, FaImage } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import { ImBlocked } from "react-icons/im";

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
    const [deletingPosts, setDeletingPosts] = useState({});
    const [profileUser, setProfileUser] = useState(null);
    const [profileUserError, setProfileUserError] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [countsLoading, setCountsLoading] = useState(true);
    const [repostingPosts, setRepostingPosts] = useState({});

    const [isBlocked, setIsBlocked] = useState(false);
    const [blockLoading, setBlockLoading] = useState(false);

    const [modalImage, setModalImage] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [uploadingCover, setUploadingCover] = useState(false);
    const fileInputRef = useRef(null);

    const [activeTab, setActiveTab] = useState('posts');

    const [commentMediaFiles, setCommentMediaFiles] = useState({});
    const [commentMediaPreviews, setCommentMediaPreviews] = useState({});
    const commentFileInputRefs = useRef({});

    const tabBarAnchorRef = useRef(null);
    const tabBarRef = useRef(null);
    const shouldScrollToTabBarRef = useRef(false);
    const [scrollToTabBarTrigger, setScrollToTabBarTrigger] = useState(0);

    const observer = useRef();
    const commentsEndRefs = useRef({});
    const isMountedRef = useRef(true);
    const [resetFeedTrigger, setResetFeedTrigger] = useState(0);
    const { id } = useParams();
    const name = localStorage.getItem('name') || 'User';
    const rawPhoto = localStorage.getItem('photo');
    const token = localStorage.getItem('login_token');
    const userId = parseInt(localStorage.getItem('user_id'));

    // ============================================================
    // Controle de montagem (evita setState após unmount)
    // ============================================================
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const verifiedUsersCacheRef = useRef(null);
    if (verifiedUsersCacheRef.current === null) {
        try {
            verifiedUsersCacheRef.current = JSON.parse(localStorage.getItem('users_verified_cache') || '{}');
        } catch {
            verifiedUsersCacheRef.current = {};
        }
    }

    const openImageModal = useCallback((url) => {
        setModalImage(url);
        setIsModalOpen(true);
        document.body.style.overflow = 'hidden';
    }, []);

    const closeImageModal = useCallback(() => {
        setIsModalOpen(false);
        setModalImage(null);
        document.body.style.overflow = 'unset';
    }, []);

    const updateCoverPhoto = useCallback(async (file) => {
        if (!file) return;
        setUploadingCover(true);
        setError('');

        try {
            const isValid = await getVerifyToken(token);
            if (!isValid) {
                window.location.href = "/";
                return;
            }

            const formData = new FormData();
            formData.append('cover_photo', file);

            const response = await api.post(`/user/${id}`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (!isMountedRef.current) return;

            if (response.data.status === 401) {
                setError('Failed to update cover photo');
            } else {
                setProfileUser(prev => ({
                    ...prev,
                    cover_photo: response.data.cover_photo || URL.createObjectURL(file)
                }));
            }
        } catch (err) {
            if (isMountedRef.current) setError('Failed to update cover photo');
        } finally {
            if (isMountedRef.current) setUploadingCover(false);
        }
    }, [id, token]);

    const handleCoverChange = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            updateCoverPhoto(file);
        }
        e.target.value = '';
    }, [updateCoverPhoto]);

    const isValidPhoto = useCallback((photo) => {
        return photo && photo.trim() !== '' && photo !== 'null' && photo !== 'undefined';
    }, []);

    const user = {
        photo: isValidPhoto(rawPhoto) ? rawPhoto : getInitialsImage(name)
    };

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

            let url = match[0];
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
                        style={{
                            color: '#1d9bf0',
                            textDecoration: 'none',
                            wordBreak: 'break-word'
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-link"
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
                        style={{
                            color: '#1d9bf0',
                            textDecoration: 'none',
                            wordBreak: 'break-word'
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-link"
                    >
                        {url}
                    </a>
                );
            }

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
        }

        if (parts.length === 0) {
            return text;
        }

        return parts;
    }, []);

    const checkVerified = useCallback((val) => val === true || val === 1 || val === "1", []);

    const getOriginalVerified = useCallback((post, ...allArrays) => {
        if (!post) return false;

        if (!post.is_repost) {
            return checkVerified(post.verified_profile)
                || checkVerified(post.user_verified_profile)
                || checkVerified(post.original_verified_profile);
        }

        if (post.original_post_id != null) {
            for (const arr of allArrays) {
                if (!arr) continue;
                const original = arr.find(
                    p => p && p.post_id != null && String(p.post_id) === String(post.original_post_id)
                );
                if (original) return checkVerified(original.verified_profile);
            }
        }

        if (post.original_verified_profile !== undefined && post.original_verified_profile !== null) {
            return checkVerified(post.original_verified_profile);
        }

        if (post.original_user_verified_profile !== undefined && post.original_user_verified_profile !== null) {
            return checkVerified(post.original_user_verified_profile);
        }

        if (post.original_user_id != null && verifiedUsersCacheRef.current[post.original_user_id] !== undefined) {
            return checkVerified(verifiedUsersCacheRef.current[post.original_user_id]);
        }

        if (post.user_id != null && String(post.user_id) === String(post.original_user_id)) {
            return checkVerified(post.verified_profile);
        }

        return false;
    }, [checkVerified]);

    useEffect(() => {
        let changed = false;
        const cache = verifiedUsersCacheRef.current;

        feed.forEach(p => {
            if (!p) return;
            const authorId = !p.is_repost
                ? p.user_id
                : (p.user_id != null && String(p.user_id) === String(p.original_user_id) ? p.original_user_id : null);
            if (authorId != null) {
                const isVerified = checkVerified(p.verified_profile);
                if (cache[authorId] !== isVerified) {
                    cache[authorId] = isVerified;
                    changed = true;
                }
            }
        });

        if (changed) {
            try {
                localStorage.setItem('users_verified_cache', JSON.stringify(cache));
            } catch { }
        }
    }, [feed, checkVerified]);

    useEffect(() => {
        if (scrollToTabBarTrigger === 0) return;
        if (!tabBarAnchorRef.current || !tabBarRef.current) return;

        const anchorRect = tabBarAnchorRef.current.getBoundingClientRect();
        const anchorDocTop = anchorRect.top + window.scrollY;

        const barMarginTop = parseFloat(
            window.getComputedStyle(tabBarRef.current).marginTop
        ) || 0;

        const targetTop = Math.max(0, anchorDocTop + barMarginTop);

        window.scrollTo({ top: targetTop, behavior: 'smooth' });
    }, [scrollToTabBarTrigger]);

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

            if (!isMountedRef.current) return;

            if (response.data.status === 401) {
                setError(response.data.error);
            } else {
                setFeed(prevFeed =>
                    prevFeed.map(post =>
                        post.post_id === originalPostId
                            ? { ...post, number_reposts: (post.number_reposts || 0) + 1 }
                            : post
                    )
                );
                setPage(1);
                setHasMore(true);
                shouldScrollToTabBarRef.current = true;
                setResetFeedTrigger(prev => prev + 1);
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError('Failed to repost');
                shouldScrollToTabBarRef.current = false;
            }
        } finally {
            if (isMountedRef.current) {
                setRepostingPosts(prev => ({ ...prev, [originalPostId]: false }));
            }
        }
    }, [token, repostingPosts, userId]);

    const fetchProfileUser = useCallback(async () => {
        try {
            if (isMountedRef.current) setProfileUserError(false);
            const response = await api.get(`/user/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (isMountedRef.current) setProfileUser(response.data);
        } catch (err) {
            if (isMountedRef.current) {
                setProfileUserError(true);
                setProfileUser(null);
            }
        }
    }, [id, token]);

    const checkIsFollowed = useCallback(async () => {
        try {
            if (isMountedRef.current) setCheckingFollowStatus(true);
            const response = await apiFeed.post('/isFollowed', {
                user_id: parseInt(id),
                follower_id: userId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (isMountedRef.current) setIsFollowed(response.data.is_followed);
        } catch (err) {
            if (isMountedRef.current) setIsFollowed(false);
        } finally {
            if (isMountedRef.current) setCheckingFollowStatus(false);
        }
    }, [id, userId, token]);

    const checkIsBlocked = useCallback(async () => {
        if (String(userId) === String(id)) {
            if (isMountedRef.current) setIsBlocked(false);
            return;
        }
        try {
            const response = await apiFeed.post('/isBlockUser', {
                user_id_bu: userId,
                user_block_id_bu: parseInt(id)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (isMountedRef.current) {
                setIsBlocked(response.data.is_blocked_user === true);
            }
        } catch (err) {
            if (isMountedRef.current) setIsBlocked(false);
        }
    }, [id, userId, token]);

    const fetchFollowCounts = useCallback(async () => {
        try {
            if (isMountedRef.current) setCountsLoading(true);
            const isValid = await getVerifyToken(token);
            if (!isValid) {
                window.location.href = "/";
                return;
            }

            const followersResponse = await apiFeed.get(`/followers/${id}/1/5`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (isMountedRef.current && followersResponse.data && typeof followersResponse.data.total === 'number') {
                setFollowersCount(followersResponse.data.total);
            }

            const followingResponse = await apiFeed.get(`/following/${id}/1/5`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (isMountedRef.current && followingResponse.data && typeof followingResponse.data.total === 'number') {
                setFollowingCount(followingResponse.data.total);
            }
        } catch (error) {
            console.error('Failed to fetch follow counts', error);
        } finally {
            if (isMountedRef.current) setCountsLoading(false);
        }
    }, [id, token]);

    const followUser = async () => {
        setFollowLoading(true);
        try {
            const response = await apiFeed.post('/follow', {
                user_id: parseInt(id),
                follower_id: userId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!isMountedRef.current) return;
            if (response.data.status === 401) {
                setError(response.data.response);
            } else {
                setIsFollowed(true);
                await fetchFollowCounts();
            }
        } catch (err) {
            if (isMountedRef.current) setError('Failed to follow user');
        } finally {
            if (isMountedRef.current) setFollowLoading(false);
        }
    };

    const unfollowUser = async () => {
        setFollowLoading(true);
        try {
            const response = await apiFeed.post('/unFollow', {
                user_id: parseInt(id),
                follower_id: userId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!isMountedRef.current) return;
            if (response.data.status === 401) {
                setError(response.data.response);
            } else {
                setIsFollowed(false);
                await fetchFollowCounts();
            }
        } catch (err) {
            if (isMountedRef.current) setError('Failed to unfollow user');
        } finally {
            if (isMountedRef.current) setFollowLoading(false);
        }
    };

    const handleBlockUser = useCallback(async () => {
        if (blockLoading) return;
        setBlockLoading(true);
        setError('');

        try {
            const isValid = await getVerifyToken(token);
            if (!isValid) {
                window.location.href = "/";
                return;
            }

            const response = await apiFeed.post('/blockUser', {
                user_id_bu: userId,
                user_block_id_bu: parseInt(id)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!isMountedRef.current) return;

            if (response.data.status === 401) {
                setError('Failed to block user');
            } else {
                await checkIsBlocked();
            }
        } catch (err) {
            if (isMountedRef.current) setError('Failed to block user');
        } finally {
            if (isMountedRef.current) setBlockLoading(false);
        }
    }, [blockLoading, token, userId, id, checkIsBlocked]);

    const handleUnblockUser = useCallback(async () => {
        if (blockLoading) return;
        setBlockLoading(true);
        setError('');

        try {
            const isValid = await getVerifyToken(token);
            if (!isValid) {
                window.location.href = "/";
                return;
            }

            const response = await apiFeed.post('/unBlockUser', {
                user_id_bu: userId,
                user_block_id_bu: parseInt(id)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!isMountedRef.current) return;

            if (response.data.status === 401) {
                setError('Failed to unblock user');
            } else {
                await checkIsBlocked();
            }
        } catch (err) {
            if (isMountedRef.current) setError('Failed to unblock user');
        } finally {
            if (isMountedRef.current) setBlockLoading(false);
        }
    }, [blockLoading, token, userId, id, checkIsBlocked]);

    // ============================================================
    // fetchFeed: NÃO retorna cleanup — recebe isCancelled externo
    // ============================================================
    const fetchFeed = useCallback(async (pageNum = page, tab = activeTab, isCancelled = () => false) => {
        setLoading(true);
        setError('');

        try {
            const isValid = await getVerifyToken(token);
            if (isCancelled() || !isMountedRef.current) return;
            if (!isValid) {
                window.location.href = "/";
                return;
            }

            let endpoint;
            if (tab === 'posts') {
                endpoint = `/profile/${id}/${pageNum}/5?user_session=${userId}`;
            } else if (tab === 'likes') {
                endpoint = `/profileLikes/${id}/${pageNum}/5?user_session=${userId}`;
            } else if (tab === 'media') {
                endpoint = `/profileMedia/${id}/${pageNum}/5?user_session=${userId}`;
            } else {
                endpoint = `/profile/${id}/${pageNum}/5?user_session=${userId}`;
            }

            const response = await apiFeed.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (isCancelled() || !isMountedRef.current) return;

            const newData = response.data?.data || [];
            if (pageNum === 1) {
                setFeed(newData);

                if (shouldScrollToTabBarRef.current) {
                    shouldScrollToTabBarRef.current = false;
                    setScrollToTabBarTrigger(prev => prev + 1);
                }
            } else if (newData.length > 0) {
                setFeed(prev => {
                    const existingIds = new Set(prev.map(post => post.post_id));
                    const newPosts = newData.filter(post => !existingIds.has(post.post_id));
                    return [...prev, ...newPosts];
                });
            }

            if (pageNum >= response.data.last_page) {
                setHasMore(false);
            }
        } catch (err) {
            if (!isCancelled() && isMountedRef.current) setError('Failed to load feed');
            shouldScrollToTabBarRef.current = false;
        } finally {
            if (!isCancelled() && isMountedRef.current) setLoading(false);
        }
    }, [token, id, userId, activeTab, page]);

    // ============================================================
    // useEffect que consome fetchFeed — retorna cleanup REAL
    // ============================================================
    useEffect(() => {
        if (!hasMore) return;

        let cancelled = false;
        const isCancelled = () => cancelled;

        fetchFeed(page, activeTab, isCancelled);

        return () => {
            cancelled = true;
        };
    }, [fetchFeed, hasMore, resetFeedTrigger, page, activeTab]);

    const changeTab = useCallback((tab) => {
        if (tab === activeTab) return;
        shouldScrollToTabBarRef.current = false;
        setActiveTab(tab);
        setPage(1);
        setHasMore(true);
        setResetFeedTrigger(prev => prev + 1);
    }, [activeTab]);

    // ============================================================
    // 1) RESET ao trocar de perfil (SEM resetar isBlocked)
    // ============================================================
    useEffect(() => {
        shouldScrollToTabBarRef.current = false;
        setFeed([]);
        setPage(1);
        setHasMore(true);
        setResetFeedTrigger(prev => prev + 1);
        setProfileUser(null);
        setProfileUserError(false);
        setFollowersCount(0);
        setFollowingCount(0);
        setCountsLoading(true);
        setBlockLoading(false);
        window.scrollTo(0, 0);
        setActiveTab('posts');
    }, [id]);

    // ============================================================
    // 2) CHECK de bloqueio — DEPOIS do reset, só reage a `id`
    // ============================================================
    useEffect(() => {
        if (!id || !userId || !token) return;
        checkIsBlocked();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (id && userId && token) {
            checkIsFollowed();
            fetchProfileUser();
            fetchFollowCounts();
        }
    }, [id, userId, token, checkIsFollowed, fetchProfileUser, fetchFollowCounts]);

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

            if (!isMountedRef.current) return;

            if (response.data.status === 401) {
                setError('Failed to delete a post');
            } else {
                setFeed(prevFeed => prevFeed.filter(post => post.post_id !== postId));
            }
        } catch (err) {
            if (isMountedRef.current) setError('Failed to delete post');
        } finally {
            if (isMountedRef.current) {
                setDeletingPosts(prev => ({ ...prev, [postId]: false }));
            }
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

            const response = await apiFeed.get(`/comments/${userId}/${postId}/${pageNum}/5`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!isMountedRef.current) return;

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
            if (isMountedRef.current) setError('Failed to load comments');
        } finally {
            if (isMountedRef.current) {
                setCommentsLoading(prev => ({ ...prev, [postId]: false }));
            }
        }
    }, [token, commentsLoading, userId]);

    const toggleComments = useCallback(async (postId) => {
        if (expandedComments[postId]) {
            setExpandedComments(prev => ({ ...prev, [postId]: false }));
        } else {
            setExpandedComments(prev => ({ ...prev, [postId]: true }));

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

    const handleCommentMediaChange = useCallback((postId, e) => {
        const file = e.target.files[0];
        if (file) {
            setCommentMediaFiles(prev => ({ ...prev, [postId]: file }));

            const reader = new FileReader();
            reader.onloadend = () => {
                if (!isMountedRef.current) return;
                setCommentMediaPreviews(prev => ({
                    ...prev,
                    [postId]: { url: reader.result, type: file.type }
                }));
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    }, []);

    const removeCommentMedia = useCallback((postId) => {
        setCommentMediaFiles(prev => {
            const newState = { ...prev };
            delete newState[postId];
            return newState;
        });
        setCommentMediaPreviews(prev => {
            const newState = { ...prev };
            delete newState[postId];
            return newState;
        });
    }, []);

    const handleAddComment = useCallback(async (postId) => {
        const commentText = commentTexts[postId] || '';
        const mediaFile = commentMediaFiles[postId];

        if (!commentText.trim() && !mediaFile) return;

        setCommentingPosts(prev => ({ ...prev, [postId]: true }));
        try {
            const isValid = await getVerifyToken(token);
            if (!isValid) {
                window.location.href = "/";
                return;
            }

            const data = new FormData();
            data.append('post_id', postId);
            data.append('user_id', userId);
            data.append('comment', commentText);
            if (mediaFile) {
                data.append('media_link', mediaFile);
            }

            const response = await apiFeed.post('/comments', data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (!isMountedRef.current) return;

            if (response.data.status === 401) {
                setError(`Failed to comment a post`);
            } else {
                await fetchComments(postId, 1);
                setCommentTexts(prev => ({ ...prev, [postId]: '' }));
                removeCommentMedia(postId);
                setFeed(prevFeed =>
                    prevFeed.map(post =>
                        post.post_id === postId
                            ? { ...post, number_comments: (post.number_comments || 0) + 1 }
                            : post
                    )
                );
            }
        } catch (err) {
            if (isMountedRef.current) setError('Failed to comment a post');
        } finally {
            if (isMountedRef.current) {
                setCommentingPosts(prev => ({ ...prev, [postId]: false }));
            }
        }
    }, [token, commentTexts, commentMediaFiles, fetchComments, userId, removeCommentMedia]);

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

            if (!isMountedRef.current) return;

            if (response.data.status === 401) {
                setError(`Failed to delete comment`);
            } else {
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
                            ? { ...post, number_comments: Math.max(0, (post.number_comments || 1) - 1) }
                            : post
                    )
                );
            }
        } catch (err) {
            if (isMountedRef.current) setError('Failed to delete comment');
        }
    }, [token, userId]);

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
            const data = { post_id: postId, user_id: userId };
            const response = await apiFeed.post(endpoint, data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!isMountedRef.current) return;

            if (response.data.status === 401) {
                setError(`Failed to ${isCurrentlyLiked ? 'unlike' : 'like'} post`);
            } else {
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
            if (isMountedRef.current) {
                setError(`Failed to ${isCurrentlyLiked ? 'unlike' : 'like'} post`);
            }
        } finally {
            if (isMountedRef.current) {
                setLikingPosts(prev => ({ ...prev, [postId]: false }));
            }
        }
    }, [token, likingPosts, userId]);

    const renderMedia = useCallback((url) => {
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
                <div className="media-container" onClick={() => openImageModal(url)} style={{ cursor: 'pointer' }}>
                    <img src={url} alt="Post media" className="post-media" />
                </div>
            );
        }
        return null;
    }, [openImageModal]);

    const renderCommentMedia = useCallback((url) => {
        if (!url || typeof url !== 'string') return null;

        const isVideo = url.toLowerCase().match(/\.(mp4|webm|ogg)$/);
        const isImage = url.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/);

        if (isVideo) {
            return (
                <div className="comment-media-container">
                    <video src={url} controls className="comment-media" />
                </div>
            );
        } else if (isImage) {
            return (
                <div className="comment-media-container" onClick={() => openImageModal(url)} style={{ cursor: 'pointer' }}>
                    <img src={url} alt="Comment media" className="comment-media" />
                </div>
            );
        }
        return null;
    }, [openImageModal]);

    const userHasLiked = useCallback((post) => {
        return post.user_has_liked === 1 || post.user_has_liked === true;
    }, []);

    const handleCommentTextChange = useCallback((postId, text) => {
        setCommentTexts(prev => ({ ...prev, [postId]: text }));
    }, []);

    const renderFollowButton = () => {
        if (userId === parseInt(id)) {
            return (
                <Link to="/edit-profile" className="btn btn-outline-secondary btn-sm edit-profile-btn">
                    Edit profile
                </Link>
            );
        }

        if (checkingFollowStatus || isLoadingProfile) {
            return (
                <button className="btn btn-secondary btn-sm follow-btn" disabled>
                    Loading...
                </button>
            );
        }

        if (followLoading) {
            return (
                <button className="btn btn-secondary btn-sm follow-btn" disabled>
                    {isFollowed ? 'Unfollowing...' : 'Following...'}
                </button>
            );
        }

        if (isFollowed) {
            return (
                <button className="btn btn-outline-secondary btn-sm follow-btn" onClick={unfollowUser}>
                    Following
                </button>
            );
        } else {
            return (
                <button className="btn btn-primary btn-sm follow-btn" onClick={followUser}>
                    Follow
                </button>
            );
        }
    };

    const renderBlockButton = () => {
        if (userId === parseInt(id)) return null;

        return (
            <button
                type="button"
                className="btn btn-outline-danger btn-sm block-btn"
                onClick={isBlocked ? handleUnblockUser : handleBlockUser}
                disabled={blockLoading}
                title={isBlocked ? "Unblock user" : "Block user"}
            >
                {blockLoading ? (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                ) : (
                    <>
                        <ImBlocked size={16} style={{ marginRight: '5px' }} />
                        {isBlocked ? 'Unblock' : 'Block'}
                    </>
                )}
            </button>
        );
    };

    const getProfileInfo = () => {
        if (profileUser) {
            return {
                photo: isValidPhoto(profileUser.photo) ? profileUser.photo : getInitialsImage(profileUser.name),
                name: profileUser.name,
                bio: profileUser.bio || null,
                city: profileUser.city || null,
                country: profileUser.country || null,
                website: profileUser.website || null,
                joinedDate: profileUser.created_at ? new Date(profileUser.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Joined recently',
                cover_photo: profileUser.cover_photo,
                verified_profile: profileUser.verified_profile || 0
            };
        }

        if (feed.length > 0) {
            const firstPost = feed[0];
            return {
                photo: isValidPhoto(firstPost.photo) ? firstPost.photo : getInitialsImage(firstPost.name),
                name: firstPost.name,
                bio: firstPost.bio || null,
                city: firstPost.city || null,
                country: firstPost.country || null,
                website: firstPost.website || null,
                joinedDate: 'Joined recently',
                cover_photo: null,
                verified_profile: firstPost.verified_profile || 0
            };
        }

        if (profileUserError || !loading) {
            return {
                photo: getInitialsImage("User"),
                name: "User",
                bio: null,
                city: null,
                country: null,
                website: null,
                joinedDate: 'Joined recently',
                cover_photo: null,
                verified_profile: 0
            };
        }

        return null;
    };

    const profileInfo = getProfileInfo();
    const isLoadingProfile = !profileInfo && !profileUserError;
    const isOwnProfile = userId === parseInt(id);

    return (
        <div>
            <SocialHeader user={user} />
            <div className="col-md-8 App-profile">
                <div className="profile-container">
                    <div className="profile-cover">
                        <div
                            className={`cover-image ${!profileInfo?.cover_photo ? 'default-cover' : ''}`}
                            style={profileInfo?.cover_photo ? { backgroundImage: `url(${profileInfo.cover_photo})` } : {}}
                        >
                            {isOwnProfile && (
                                <>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleCoverChange}
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingCover}
                                        style={{
                                            position: 'absolute',
                                            top: '12px',
                                            right: '12px',
                                            background: 'rgba(0,0,0,0.5)',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '38px',
                                            height: '38px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s',
                                            fontSize: '18px',
                                            zIndex: 5,
                                            backdropFilter: 'blur(2px)'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = 'rgba(0,0,0,0.7)'}
                                        onMouseLeave={(e) => e.target.style.background = 'rgba(0,0,0,0.5)'}
                                        title="Update cover photo"
                                    >
                                        {uploadingCover ? (
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                                        ) : (
                                            <FaCamera />
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                        <div className="profile-info-section">
                            <div className="profile-avatar-container">
                                {isLoadingProfile ? (
                                    <div className="profile-avatar loading-placeholder">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <img
                                        src={profileInfo.photo}
                                        alt="Profile"
                                        className="profile-avatar"
                                    />
                                )}
                            </div>
                            <div className="profile-actions">
                                {renderFollowButton()}
                                {renderBlockButton()}
                            </div>
                        </div>
                    </div>

                    <div className="profile-details">
                        <div className="profile-name-section">
                            {isLoadingProfile || checkingFollowStatus ? (
                                <div className="profile-name-row">
                                    <h2 className="profile-name">Loading...</h2>
                                </div>
                            ) : (
                                <div className="profile-name-row">
                                    <h2 className="profile-name">{profileInfo.name}</h2>
                                    {checkVerified(profileInfo?.verified_profile) ? (
                                        <RiVerifiedBadgeFill
                                            className="verified-badge"
                                            title="Verified"
                                            size={25}
                                        />
                                    ) : isOwnProfile && (
                                        <Link to="/verified" className="get-verified-link-simple">
                                            Get Verified
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>

                        {profileInfo?.bio && (
                            <div className="profile-bio">
                                <p className="bio-text">{formatTextWithLinks(profileInfo.bio)}</p>
                            </div>
                        )}

                        <div className="profile-meta">
                            {(profileInfo?.city || profileInfo?.country || profileInfo?.website) && (
                                <div className="location-website-container">
                                    {profileInfo?.city && profileInfo?.country && (
                                        <span className="location-info">
                                            {profileInfo.city}, {profileInfo.country}
                                        </span>
                                    )}

                                    {profileInfo?.city && !profileInfo?.country && (
                                        <span className="location-info">
                                            {profileInfo.city}
                                        </span>
                                    )}

                                    {!profileInfo?.city && profileInfo?.country && (
                                        <span className="location-info">
                                            {profileInfo.country}
                                        </span>
                                    )}

                                    {profileInfo?.website && (
                                        <span className="website-info">
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                                                🔗 {formatTextWithLinks(profileInfo.website)}
                                            </span>
                                        </span>
                                    )}
                                </div>
                            )}

                            <div className="joined-date-container">
                                <span className="joined-date">
                                    {isLoadingProfile ? "Joined recently" : `Joined ${profileInfo.joinedDate}`}
                                </span>
                            </div>
                        </div>

                        <div className="follow-counts">
                            {isOwnProfile ? (
                                <>
                                    <Link
                                        to="/following"
                                        className="btn btn-primary btn-sm"
                                        style={{
                                            marginRight: "10px",
                                            backgroundColor: '#085f7f',
                                            borderColor: '#085f7f',
                                            color: '#fff',
                                            textDecoration: 'none'
                                        }}
                                    >
                                        <span style={{ margin: 0 }}>
                                            {countsLoading ? "Loading..." : `${followingCount} Following`}
                                        </span>
                                    </Link>

                                    <Link
                                        to="/followers"
                                        className="btn btn-primary btn-sm"
                                        style={{
                                            backgroundColor: '#085f7f',
                                            borderColor: '#085f7f',
                                            color: '#fff',
                                            textDecoration: 'none'
                                        }}
                                    >
                                        <span style={{ margin: 0 }}>
                                            {countsLoading ? "Loading..." : `${followersCount} Followers`}
                                        </span>
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to={`/following-users/${id}`}
                                        className="btn btn-primary btn-sm"
                                        style={{
                                            marginRight: "10px",
                                            backgroundColor: '#085f7f',
                                            borderColor: '#085f7f',
                                            color: '#fff',
                                            textDecoration: 'none'
                                        }}
                                    >
                                        <span style={{ margin: 0 }}>
                                            {countsLoading ? "Loading..." : `${followingCount} Following`}
                                        </span>
                                    </Link>

                                    <Link
                                        to={`/followers-users/${id}`}
                                        className="btn btn-primary btn-sm"
                                        style={{
                                            backgroundColor: '#085f7f',
                                            borderColor: '#085f7f',
                                            color: '#fff',
                                            textDecoration: 'none'
                                        }}
                                    >
                                        <span style={{ margin: 0 }}>
                                            {countsLoading ? "Loading..." : `${followersCount} Followers`}
                                        </span>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {error && <Alert color="danger" fade={false} className="text-center">{error}</Alert>}

                    <div
                        ref={tabBarAnchorRef}
                        style={{ height: 0, margin: 0, padding: 0, border: 0 }}
                        aria-hidden="true"
                    />

                    <div className="tab-bar-sticky" ref={tabBarRef}>
                        <div className="tab-bar-inner">
                            <div className={`tab-item ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => changeTab('posts')}>
                                POSTS
                                {activeTab === 'posts' && <span className="tab-indicator" />}
                            </div>
                            <div className={`tab-item ${activeTab === 'likes' ? 'active' : ''}`} onClick={() => changeTab('likes')}>
                                LIKES
                                {activeTab === 'likes' && <span className="tab-indicator" />}
                            </div>
                            <div className={`tab-item ${activeTab === 'media' ? 'active' : ''}`} onClick={() => changeTab('media')}>
                                MEDIA
                                {activeTab === 'media' && <span className="tab-indicator" />}
                            </div>
                        </div>
                    </div>

                    <div className="posts-section">
                        {feed.length === 0 && !loading && (
                            <p className="text-center text-muted no-posts">
                                {activeTab === 'posts' && 'No posts found'}
                                {activeTab === 'likes' && 'No liked posts found'}
                                {activeTab === 'media' && 'No media posts found'}
                            </p>
                        )}

                        {feed.map((post, index) => {
                            const isLast = index === feed.length - 1;
                            const photo = isValidPhoto(post.photo) ? post.photo : getInitialsImage(post.name);
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
                            const commentMediaPreview = commentMediaPreviews[post.post_id];

                            return (
                                <div key={post.post_id} ref={isLast ? lastPostRef : null} className="profile-item">
                                    <div className="post-header">
                                        {post.is_repost ? (
                                            <>
                                                <div className="repost-indicator">
                                                    <BiRepost size={14} style={{ marginRight: '5px' }} />
                                                    <small className="text-muted">
                                                        <strong>{post.name}</strong>
                                                        {checkVerified(post.verified_profile) && (
                                                            <RiVerifiedBadgeFill className="verified-badge" size={14} />
                                                        )}
                                                        {' '}reposted
                                                    </small>
                                                </div>
                                                <Link to={`/profile/${post.original_user_id}`}>
                                                    <img
                                                        src={isValidPhoto(post.original_user_photo)
                                                            ? post.original_user_photo
                                                            : getInitialsImage(post.original_user_name || 'User')}
                                                        alt={post.original_user_name}
                                                        className="post-user-photo"
                                                    />
                                                </Link>
                                            </>
                                        ) : (
                                            <Link to={`/profile/${post.user_id}`}>
                                                <img src={photo} alt={post.name} className="post-user-photo" />
                                            </Link>
                                        )}
                                        <div className="post-user-info">
                                            <div className="post-user-name-container">
                                                <strong className="post-user-name">
                                                    {post.is_repost ? post.original_user_name : post.name}
                                                </strong>
                                                {getOriginalVerified(post, feed) && (
                                                    <RiVerifiedBadgeFill className="verified-badge post-verified-badge" title="Verified" />
                                                )}
                                            </div>
                                            <span className="post-date">{new Date(post.created_at).toLocaleDateString()}</span>
                                        </div>

                                        {(isPostOwner || (post.is_repost && post.user_id === userId)) ? (
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

                                    <p className="post-description">
                                        {formatTextWithLinks(post.description)}
                                    </p>
                                    {renderMedia(post.media_link)}

                                    <div className="post-actions">
                                        <div className="post-buttons" style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            width: '100%',
                                            gap: '8px'
                                        }}>
                                            <Button
                                                color={hasLiked ? "primary" : "secondary"}
                                                size="sm"
                                                onClick={() => handleLike(post.post_id, post.number_likes, hasLiked)}
                                                disabled={isLiking}
                                                className="like-button"
                                                style={{ flex: 1, padding: '4px 8px', fontSize: '14px', minHeight: '32px', borderRadius: '20px' }}
                                            >
                                                {isLiking ? '...' : (
                                                    <>
                                                        <AiFillHeart size={16} style={{ marginRight: '5px', color: hasLiked ? '#dc3545' : '#6c757d' }} />
                                                        {post.number_likes || 0}
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                color="info"
                                                size="sm"
                                                onClick={() => toggleComments(post.post_id)}
                                                className="comment-button"
                                                style={{ flex: 1, padding: '4px 8px', fontSize: '14px', minHeight: '32px', borderRadius: '20px' }}
                                            >
                                                <FaCommentDots size={16} style={{ marginRight: '5px' }} />
                                                {post.number_comments || 0}
                                            </Button>
                                            <Button
                                                color="primary"
                                                size="sm"
                                                onClick={() => handleRepost(
                                                    post.post_id,
                                                    post.original_user_id || post.user_id,
                                                    post.description,
                                                    post.media_link,
                                                    post.name
                                                )}
                                                disabled={isReposting}
                                                className="repost-button"
                                                style={{ flex: 1, padding: '4px 8px', fontSize: '14px', minHeight: '32px', borderRadius: '20px' }}
                                            >
                                                {isReposting ? '...' : (
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
                                                {isCommentsLoading && postComments.length === 0 ? (
                                                    <p className="text-center">Loading comments...</p>
                                                ) : postComments.length > 0 ? (
                                                    <>
                                                        {postComments.map((comment) => {
                                                            const commentUserPhoto = isValidPhoto(comment.photo)
                                                                ? comment.photo
                                                                : getInitialsImage(comment.name);

                                                            return (
                                                                <div key={comment.id} className="comment-item">
                                                                    <div className="comment-header">
                                                                        <Link to={`/profile/${comment.user_id}`}>
                                                                            <img src={commentUserPhoto} alt={comment.name} className="comment-user-photo" />
                                                                        </Link>
                                                                        <div className="comment-content">
                                                                            <strong className="comment-user-name">
                                                                                {comment.name}
                                                                                {checkVerified(comment.verified_profile) && (
                                                                                    <RiVerifiedBadgeFill className="verified-badge comment-verified-badge" title="Verified" />
                                                                                )}
                                                                            </strong>
                                                                            <p className="comment-text">
                                                                                {formatTextWithLinks(comment.comment)}
                                                                            </p>
                                                                            {comment.media_link_comment && renderCommentMedia(comment.media_link_comment)}
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

                                                {isCommentsLoading && postComments.length > 0 && (
                                                    <p className="text-center">Loading more comments...</p>
                                                )}
                                            </div>

                                            <div className="add-comment-form">
                                                {commentMediaPreview && (
                                                    <div className="comment-media-preview">
                                                        {commentMediaPreview.type.startsWith('video') ? (
                                                            <video src={commentMediaPreview.url} className="comment-media-preview-item" controls />
                                                        ) : (
                                                            <img src={commentMediaPreview.url} alt="Preview" className="comment-media-preview-item" />
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="comment-media-remove-btn"
                                                            onClick={() => removeCommentMedia(post.post_id)}
                                                            title="Remove media"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="comment-input-container">
                                                    <textarea
                                                        value={currentCommentText}
                                                        onChange={e => handleCommentTextChange(post.post_id, e.target.value)}
                                                        placeholder="Write a comment..."
                                                        rows="1"
                                                        className="comment-input"
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            borderRadius: '4px',
                                                            border: '1px solid #1d9bf0',
                                                            outline: 'none',
                                                            transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
                                                        }}
                                                        onFocus={(e) => {
                                                            e.target.style.borderColor = '#1d9bf0';
                                                            e.target.style.boxShadow = '0 0 0 0.2rem rgba(29, 155, 240, 0.25)';
                                                        }}
                                                        onBlur={(e) => {
                                                            e.target.style.borderColor = '#1d9bf0';
                                                            e.target.style.boxShadow = 'none';
                                                        }}
                                                    />
                                                    <input
                                                        type="file"
                                                        ref={el => commentFileInputRefs.current[post.post_id] = el}
                                                        onChange={(e) => handleCommentMediaChange(post.post_id, e)}
                                                        accept="image/*,video/*"
                                                        style={{ display: 'none' }}
                                                    />
                                                    <div className="comment-actions-row">
                                                        <button
                                                            type="button"
                                                            className="comment-media-btn"
                                                            onClick={() => commentFileInputRefs.current[post.post_id]?.click()}
                                                            title="Attach image or video"
                                                        >
                                                            <FaImage size={18} />
                                                        </button>
                                                        <Button
                                                            color="primary"
                                                            size="sm"
                                                            onClick={() => handleAddComment(post.post_id)}
                                                            disabled={(!currentCommentText.trim() && !commentMediaFiles[post.post_id]) || isCommenting}
                                                            className="comment-submit-btn"
                                                        >
                                                            {isCommenting ? '...' : 'Post'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {loading && <p className="text-center">Loading...</p>}
                        <br />
                        {!hasMore && feed.length > 0 && <p className="text-center text-muted">No more posts</p>}
                    </div>
                </div>
            </div>

            {isModalOpen && modalImage && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 9999,
                        cursor: 'pointer'
                    }}
                    onClick={closeImageModal}
                >
                    <div
                        style={{ maxWidth: '90%', maxHeight: '90%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={modalImage}
                            alt="Full screen"
                            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }}
                        />
                    </div>
                    <button
                        onClick={closeImageModal}
                        style={{
                            position: 'fixed',
                            top: '20px',
                            right: '20px',
                            background: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            border: 'none',
                            fontSize: '30px',
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s',
                            zIndex: 10000
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                        onMouseLeave={(e) => e.target.style.background = 'rgba(0,0,0,0.6)'}
                    >
                        ×
                    </button>
                </div>
            )}

            <Footer />
        </div>
    );
}