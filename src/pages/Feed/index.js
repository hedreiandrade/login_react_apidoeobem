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
import { FaTrash, FaCommentDots, FaTimes } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";

export default function FeedPage() {
    useExpireToken();

    // Tab state
    const [activeTab, setActiveTab] = useState('feed'); // 'feed' or 'explore'

    // Feed state
    const [feed, setFeed] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Explore state
    const [explorePosts, setExplorePosts] = useState([]);
    const [explorePage, setExplorePage] = useState(1);
    const [exploreHasMore, setExploreHasMore] = useState(true);
    const [exploreLoading, setExploreLoading] = useState(false);

    // Shared states
    const [likingPosts, setLikingPosts] = useState({});
    const [commentingPosts, setCommentingPosts] = useState({});
    const [expandedComments, setExpandedComments] = useState({});
    const [commentsData, setCommentsData] = useState({});
    const [commentTexts, setCommentTexts] = useState({});
    const [commentsLoading, setCommentsLoading] = useState({});
    const [deletingPosts, setDeletingPosts] = useState({});
    const [repostingPosts, setRepostingPosts] = useState({});
    
    // Modal state for image preview
    const [modalImage, setModalImage] = useState(null);
    
    const observer = useRef();
    const exploreObserver = useRef();
    const commentsEndRefs = useRef({});
    const [resetFeedTrigger, setResetFeedTrigger] = useState(0);
    const userId = parseInt(localStorage.getItem('user_id'));
    const name = localStorage.getItem('name') || 'User';
    const rawPhoto = localStorage.getItem('photo');
    const token = localStorage.getItem('login_token');
    
    // Ref para controlar se o componente está montado
    const isMountedRef = useRef(true);

    const isValidPhoto = useCallback((photo) => {
        return photo && photo.trim() !== '' && photo !== 'null' && photo !== 'undefined';
    }, []);

    const user = {
        photo: isValidPhoto(rawPhoto) ? rawPhoto : getInitialsImage(name)
    };

    // Função para formatar texto com links clicáveis
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
                        {displayUrl}
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

    // Função para fazer repost
    const handleRepost = useCallback(async (originalPostId, originalUserId, originalDescription, originalMediaLink, originalUserName) => {
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
                    // Update both feed and explore lists
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
                    setExplorePosts(prevExplore => 
                        prevExplore.map(post => 
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
                    
                    // If explore tab is active, refresh explore data
                    if (activeTab === 'explore') {
                        setExplorePage(1);
                        setExplorePosts([]);
                        setExploreHasMore(true);
                    }
                }
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError('Falha ao repostar');
            }
        } finally {
            if (isMountedRef.current) {
                setRepostingPosts(prev => ({ ...prev, [originalPostId]: false }));
            }
        }
    }, [token, repostingPosts, userId, activeTab]);

    const fetchFeed = useCallback(async (pageNum = page) => {
        if (isMountedRef.current) setLoading(true);
        if (isMountedRef.current) setError('');
        
        try {
            const isValid = await getVerifyToken(token);
            if (!isValid && isMountedRef.current) {
                window.location.href = "/";
                return;
            }
            
            const response = await apiFeed.get(`/feed/${userId}/${pageNum}/5`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (isMountedRef.current && response.data.data.length > 0) {
                setFeed(prev => {
                    const existingIds = new Set(prev.map(post => post.post_id));
                    const newPosts = response.data.data.filter(post => !existingIds.has(post.post_id));
                    return [...prev, ...newPosts];
                });
            }

            if (isMountedRef.current && pageNum >= response.data.last_page) {
                setHasMore(false);
            }
        } catch (err) {
            if (isMountedRef.current) {
                // TRATAMENTO ESPECÍFICO PARA 401
                if (err.response?.status === 401) {
                    // Token expirou durante a requisição
                    window.location.href = "/";
                    return;
                }
                setError('Falha ao carregar feed');
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, [token, page, userId]);

    // Fetch Explore
    const fetchExplore = useCallback(async (pageNum = explorePage) => {
        if (isMountedRef.current) setExploreLoading(true);
        if (isMountedRef.current) setError('');
        
        try {
            const isValid = await getVerifyToken(token);
            if (!isValid && isMountedRef.current) {
                window.location.href = "/";
                return;
            }
            
            const response = await apiFeed.get(`/explore/${userId}/${pageNum}/5`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (isMountedRef.current && response.data.data.length > 0) {
                setExplorePosts(prev => {
                    const existingIds = new Set(prev.map(post => post.post_id));
                    const newPosts = response.data.data.filter(post => !existingIds.has(post.post_id));
                    return [...prev, ...newPosts];
                });
            }

            if (isMountedRef.current && pageNum >= response.data.last_page) {
                setExploreHasMore(false);
            }
        } catch (err) {
            if (isMountedRef.current) {
                if (err.response?.status === 401) {
                    window.location.href = "/";
                    return;
                }
                setError('Falha ao carregar posts explorar');
            }
        } finally {
            if (isMountedRef.current) setExploreLoading(false);
        }
    }, [token, explorePage, userId]);

    useEffect(() => {
        isMountedRef.current = true;
        
        if (activeTab === 'feed') {
            if (hasMore) {
                fetchFeed(page);
            }
        } else {
            if (exploreHasMore) {
                fetchExplore(explorePage);
            }
        }
        
        return () => {
            isMountedRef.current = false;
        };
    }, [fetchFeed, fetchExplore, hasMore, exploreHasMore, resetFeedTrigger, page, explorePage, activeTab]);

    // Reset and fetch when tab changes
    useEffect(() => {
        if (activeTab === 'feed') {
            if (feed.length === 0 && hasMore) {
                fetchFeed(1);
            }
        } else {
            if (explorePosts.length === 0 && exploreHasMore) {
                fetchExplore(1);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const lastPostRef = useCallback(node => {
        if (loading || activeTab !== 'feed') return;
        if (observer.current) observer.current.disconnect();
        
        requestAnimationFrame(() => {
            observer.current = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting && hasMore && isMountedRef.current) {
                    setPage(prevPage => prevPage + 1);
                }
            }, {
                rootMargin: '100px',
                threshold: 0.1
            });
            
            if (node) observer.current.observe(node);
        });
    }, [loading, hasMore, activeTab]);

    const lastExplorePostRef = useCallback(node => {
        if (exploreLoading || activeTab !== 'explore') return;
        if (exploreObserver.current) exploreObserver.current.disconnect();
        
        requestAnimationFrame(() => {
            exploreObserver.current = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting && exploreHasMore && isMountedRef.current) {
                    setExplorePage(prevPage => prevPage + 1);
                }
            }, {
                rootMargin: '100px',
                threshold: 0.1
            });
            
            if (node) exploreObserver.current.observe(node);
        });
    }, [exploreLoading, exploreHasMore, activeTab]);

    const handleDeletePost = useCallback(async (postId) => {
        if (deletingPosts[postId]) return;

        setDeletingPosts(prev => ({ ...prev, [postId]: true }));

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
                if(response.data.status === 401){
                    setError('Falha ao deletar o post');
                }else{
                    setFeed(prevFeed => prevFeed.filter(post => post.post_id !== postId));
                    setExplorePosts(prevExplore => prevExplore.filter(post => post.post_id !== postId));
                }
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError('Falha ao deletar post');
            }
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
            if (!isValid && isMountedRef.current) {
                window.location.href = "/";
                return;
            }

            const response = await apiFeed.get(`/comments/${postId}/${pageNum}/5`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
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
                setError('Falha ao carregar comentários');
            }
        } finally {
            if (isMountedRef.current) {
                setCommentsLoading(prev => ({ ...prev, [postId]: false }));
            }
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
                if (entries[0].isIntersecting && isMountedRef.current) {
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
            if (!isValid && isMountedRef.current) {
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
            
            if (isMountedRef.current) {
                if(response.data.status === 401){
                    setError(`Falha ao comentar no post`);
                }else{
                    await fetchComments(postId, 1);
                    setCommentTexts(prev => ({
                        ...prev,
                        [postId]: ''
                    }));
                    // Update both feed and explore
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
                    setExplorePosts(prevExplore => 
                        prevExplore.map(post => 
                            post.post_id === postId 
                                ? { 
                                    ...post, 
                                    number_comments: (post.number_comments || 0) + 1
                                } 
                                : post
                        )
                    );
                }
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError('Falha ao comentar no post');
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
                if(response.data.status === 401){
                    setError(`Falha ao deletar comentário`);
                }else{
                    setCommentsData(prev => ({
                        ...prev,
                        [postId]: {
                            ...prev[postId],
                            data: prev[postId]?.data?.filter(comment => comment.id !== commentId) || []
                        }
                    }));
                    // Update both feed and explore
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
                    setExplorePosts(prevExplore => 
                        prevExplore.map(post => 
                            post.post_id === postId 
                                ? { 
                                    ...post, 
                                    number_comments: Math.max(0, (post.number_comments || 1) - 1)
                                } 
                                : post
                        )
                    );
                }
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError('Falha ao deletar comentário');
            }
        }
    }, [token, userId]);

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
            
            if (isMountedRef.current) {
                if(response.data.status === 401){
                    setError(`Falha ao ${isCurrentlyLiked ? 'descurtir' : 'curtir'} post`);
                }else{
                    // Update both feed and explore
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
                    setExplorePosts(prevExplore => 
                        prevExplore.map(post => 
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
                setError(`Falha ao ${isCurrentlyLiked ? 'descurtir' : 'curtir'} post`);
            }
        } finally {
            if (isMountedRef.current) {
                setLikingPosts(prev => ({ ...prev, [postId]: false }));
            }
        }
    }, [token, likingPosts, userId]);

    const renderMedia = useCallback((url, isPreview = false) => {
        if (!url || typeof url !== 'string') return null;

        const isVideo = url.toLowerCase().match(/\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv|m4v)$/);
        const isImage = url.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)$/);

        if (isVideo) {
            return (
                <div className="video-container" style={{ position: 'relative', width: '100%' }}>
                    <video 
                        src={url} 
                        controls 
                        className="post-media"
                        playsInline
                        webkit-playsinline="true"
                        preload="metadata"
                        style={{
                            width: '100%',
                            height: 'auto',
                            maxHeight: '500px',
                            objectFit: 'contain',
                            backgroundColor: '#000'
                        }}
                        onError={(e) => {
                            console.error('Erro ao carregar vídeo:', url);
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = `
                                <div class="video-error" style="padding: 20px; text-align: center; background: #f8f9fa;">
                                    <p>Não foi possível carregar o vídeo</p>
                                    <a href="${url}" target="_blank" rel="noopener noreferrer">Abrir vídeo</a>
                                </div>
                            `;
                        }}
                    >
                        <source src={url} type="video/mp4" />
                        <source src={url} type="video/webm" />
                        <source src={url} type="video/ogg" />
                        Seu navegador não suporta a tag de vídeo.
                    </video>
                </div>
            );
        } else if (isImage) {
            return (
                <img 
                    src={url} 
                    alt="Mídia do post" 
                    className="post-media"
                    style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '500px',
                        objectFit: 'contain',
                        cursor: 'pointer'
                    }}
                    loading="lazy"
                    onClick={() => setModalImage(url)}
                    onError={(e) => {
                        console.error('Erro ao carregar imagem:', url);
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                            <div class="image-error" style="padding: 20px; text-align: center; background: #f8f9fa;">
                                <p>Não foi possível carregar a imagem</p>
                                <a href="${url}" target="_blank" rel="noopener noreferrer">Abrir imagem</a>
                            </div>
                        `;
                    }}
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

    // Render user profile header
    const renderUserHeader = () => (
        <div className="user-info-header" style={{ marginBottom: '20px', marginTop: '20px' }}>
            <Link to={`/profile/${userId}`}>
                <img 
                    src={user.photo} 
                    alt="Usuário" 
                    className="header-user-photo"
                    style={{
                        width: '130px',
                        height: '130px',
                        objectFit: 'cover',
                        borderRadius: '50%'
                    }}
                    onError={(e) => {
                        e.target.src = getInitialsImage(name);
                    }}
                />
            </Link>
            <div className="header-user-details">
                <h3 className="header-user-name">{name}</h3>
            </div>
        </div>
    );

    // Render modal for image preview
    const renderImageModal = () => {
        if (!modalImage) return null;
        return (
            <div 
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999,
                    cursor: 'pointer'
                }}
                onClick={() => setModalImage(null)}
            >
                <img 
                    src={modalImage} 
                    alt="Prévia ampliada" 
                    style={{
                        maxWidth: '90%',
                        maxHeight: '90%',
                        objectFit: 'contain'
                    }}
                />
                <button
                    onClick={() => setModalImage(null)}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        fontSize: '20px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        cursor: 'pointer',
                        zIndex: 10000
                    }}
                >
                    <FaTimes />
                </button>
            </div>
        );
    };

    return (
        <div>
            <SocialHeader user={user} />
            
            {/* Faixa azul #27CCF5 ocupando toda a largura */}
            <div style={{ 
                backgroundColor: '#27ADF5',
                width: '100%',
                padding: '0',
                margin: '0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                <div className="col-md-6" style={{ margin: '0 auto', padding: '0' }}>
                    <div style={{ 
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '0'
                    }}>
                        <div 
                            className="tab-item feed-tab"
                            onClick={() => setActiveTab('feed')}
                            style={{
                                flex: 1,
                                padding: '14px 0',
                                textAlign: 'center',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                color: '#ffffff',
                                fontSize: '16px',
                                position: 'relative',
                                transition: 'all 0.3s ease',
                                backgroundColor: 'transparent',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                            }}
                        >
                            Feed
                            {activeTab === 'feed' && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '0',
                                    left: '30%',
                                    right: '30%',
                                    height: '3px',
                                    backgroundColor: '#F5A927',
                                    borderRadius: '3px 3px 0 0'
                                }} />
                            )}
                        </div>
                        <div 
                            className="tab-item explore-tab"
                            onClick={() => setActiveTab('explore')}
                            style={{
                                flex: 1,
                                padding: '14px 0',
                                textAlign: 'center',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                color: '#ffffff',
                                fontSize: '16px',
                                position: 'relative',
                                transition: 'all 0.3s ease',
                                backgroundColor: 'transparent',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                            }}
                        >
                            Explorar
                            {activeTab === 'explore' && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '0',
                                    left: '30%',
                                    right: '30%',
                                    height: '3px',
                                    backgroundColor: '#F5A927',
                                    borderRadius: '3px 3px 0 0'
                                }} />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-md-6 App-feed">
                <div className="feed-container" style={{ paddingTop: '20px' }}>
                    {/* Conteúdo da aba Feed */}
                    {activeTab === 'feed' && (
                        <>
                            {renderUserHeader()}
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
                                        style={{ marginBottom: '20px' }}
                                    >
                                        {/* Header do post com indicador de repost */}
                                        <div className="post-header">
                                            {post.is_repost ? (
                                                <>
                                                    <div className="repost-indicator">
                                                        <BiRepost size={14} style={{ marginRight: '5px' }} />
                                                        <small className="text-muted">
                                                            <strong>{post.name}</strong> repostou
                                                        </small>
                                                    </div>
                                                    <Link to={`/profile/${post.original_user_id}`}>
                                                        <img 
                                                            src={isValidPhoto(post.original_user_photo) 
                                                                ? post.original_user_photo 
                                                                : getInitialsImage(post.original_user_name || 'Usuário')} 
                                                            alt={post.original_user_name} 
                                                            className="post-user-photo"
                                                            style={{
                                                                width: '40px',
                                                                height: '40px',
                                                                objectFit: 'cover'
                                                            }}
                                                            onError={(e) => {
                                                                e.target.src = getInitialsImage(post.original_user_name || 'Usuário');
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
                                                        style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            objectFit: 'cover'
                                                        }}
                                                        onError={(e) => {
                                                            e.target.src = getInitialsImage(post.name);
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
                                            {(isPostOwner || (post.is_repost && post.user_id === userId)) ? (
                                                <Button 
                                                    color="link" 
                                                    size="sm"
                                                    className="post-delete-btn"
                                                    onClick={() => handleDeletePost(post.post_id)}
                                                    disabled={isDeleting}
                                                    title={post.is_repost ? "Deletar repost" : "Deletar post"}
                                                >
                                                    {isDeleting ? (
                                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                    ) : (
                                                        <FaTrash size={16} />
                                                    )}
                                                </Button>
                                            ) : null}
                                        </div>

                                        {/* Descrição com links clicáveis */}
                                        <p className="post-description">
                                            {formatTextWithLinks(post.description)}
                                        </p>

                                        {/* Container de mídia responsivo */}
                                        <div className="media-container" style={{ marginTop: '10px' }}>
                                            {renderMedia(post.media_link)}
                                        </div>

                                        <div className="post-actions" style={{ marginTop: '10px' }}>
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
                                                    style={{ 
                                                        flex: 1,
                                                        padding: '4px 8px',
                                                        fontSize: '14px',
                                                        minHeight: '32px',
                                                        borderRadius: '20px'
                                                    }}
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
                                                    style={{ 
                                                        flex: 1,
                                                        padding: '4px 8px',
                                                        fontSize: '14px',
                                                        minHeight: '32px',
                                                        borderRadius: '20px'
                                                    }}
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
                                                    style={{ 
                                                        flex: 1,
                                                        padding: '4px 8px',
                                                        fontSize: '14px',
                                                        minHeight: '32px',
                                                        borderRadius: '20px'
                                                    }}
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
                                                    {isCommentsLoading && postComments.length === 0 ? (
                                                        <p className="text-center">Carregando comentários...</p>
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
                                                                                <img 
                                                                                    src={commentUserPhoto} 
                                                                                    alt={comment.name} 
                                                                                    className="comment-user-photo"
                                                                                    style={{
                                                                                        width: '30px',
                                                                                        height: '30px',
                                                                                        objectFit: 'cover'
                                                                                    }}
                                                                                    onError={(e) => {
                                                                                        e.target.src = getInitialsImage(comment.name);
                                                                                    }}
                                                                                />
                                                                            </Link>
                                                                            <div className="comment-content">
                                                                                <strong className="comment-user-name">{comment.name}</strong>
                                                                                <p className="comment-text">
                                                                                    {formatTextWithLinks(comment.comment)}
                                                                                </p>
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
                                                                                    title="Deletar comentário"
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
                                                        <p className="text-muted text-center no-comments">Nenhum comentário ainda</p>
                                                    )}
                                                    
                                                    {isCommentsLoading && postComments.length > 0 && (
                                                        <p className="text-center">Carregando mais comentários...</p>
                                                    )}
                                                </div>

                                                <div className="add-comment-form">
                                                    <div className="comment-input-container">
                                                        <Input
                                                            type="textarea"
                                                            value={currentCommentText}
                                                            onChange={e => handleCommentTextChange(post.post_id, e.target.value)}
                                                            placeholder="Escreva um comentário..."
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
                                                            {isCommenting ? '...' : 'Publicar'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {loading && <p className="text-center">Carregando...</p>}
                            <br/>
                            {!hasMore && <p className="text-center text-muted">Não há mais posts</p>}
                        </>
                    )}

                    {/* Conteúdo da aba Explore */}
                    {activeTab === 'explore' && (
                        <>
                            {renderUserHeader()}
                            {error && <Alert color="danger" fade={false} className="text-center">{error}</Alert>}
                            {explorePosts.map((post, index) => {
                                const isLast = index === explorePosts.length - 1;
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
                                        ref={isLast ? lastExplorePostRef : null}
                                        className="post-item"
                                        style={{ marginBottom: '20px' }}
                                    >
                                        {/* Header do post com indicador de repost */}
                                        <div className="post-header">
                                            {post.is_repost ? (
                                                <>
                                                    <div className="repost-indicator">
                                                        <BiRepost size={14} style={{ marginRight: '5px' }} />
                                                        <small className="text-muted">
                                                            <strong>{post.name}</strong> repostou
                                                        </small>
                                                    </div>
                                                    <Link to={`/profile/${post.original_user_id}`}>
                                                        <img 
                                                            src={isValidPhoto(post.original_user_photo) 
                                                                ? post.original_user_photo 
                                                                : getInitialsImage(post.original_user_name || 'Usuário')} 
                                                            alt={post.original_user_name} 
                                                            className="post-user-photo"
                                                            style={{
                                                                width: '40px',
                                                                height: '40px',
                                                                objectFit: 'cover'
                                                            }}
                                                            onError={(e) => {
                                                                e.target.src = getInitialsImage(post.original_user_name || 'Usuário');
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
                                                        style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            objectFit: 'cover'
                                                        }}
                                                        onError={(e) => {
                                                            e.target.src = getInitialsImage(post.name);
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
                                            {(isPostOwner || (post.is_repost && post.user_id === userId)) ? (
                                                <Button 
                                                    color="link" 
                                                    size="sm"
                                                    className="post-delete-btn"
                                                    onClick={() => handleDeletePost(post.post_id)}
                                                    disabled={isDeleting}
                                                    title={post.is_repost ? "Deletar repost" : "Deletar post"}
                                                >
                                                    {isDeleting ? (
                                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                    ) : (
                                                        <FaTrash size={16} />
                                                    )}
                                                </Button>
                                            ) : null}
                                        </div>

                                        {/* Descrição com links clicáveis */}
                                        <p className="post-description">
                                            {formatTextWithLinks(post.description)}
                                        </p>

                                        {/* Container de mídia responsivo */}
                                        <div className="media-container" style={{ marginTop: '10px' }}>
                                            {renderMedia(post.media_link)}
                                        </div>

                                        <div className="post-actions" style={{ marginTop: '10px' }}>
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
                                                    style={{ 
                                                        flex: 1,
                                                        padding: '4px 8px',
                                                        fontSize: '14px',
                                                        minHeight: '32px',
                                                        borderRadius: '20px'
                                                    }}
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
                                                    style={{ 
                                                        flex: 1,
                                                        padding: '4px 8px',
                                                        fontSize: '14px',
                                                        minHeight: '32px',
                                                        borderRadius: '20px'
                                                    }}
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
                                                    style={{ 
                                                        flex: 1,
                                                        padding: '4px 8px',
                                                        fontSize: '14px',
                                                        minHeight: '32px',
                                                        borderRadius: '20px'
                                                    }}
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
                                                    {isCommentsLoading && postComments.length === 0 ? (
                                                        <p className="text-center">Carregando comentários...</p>
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
                                                                                <img 
                                                                                    src={commentUserPhoto} 
                                                                                    alt={comment.name} 
                                                                                    className="comment-user-photo"
                                                                                    style={{
                                                                                        width: '30px',
                                                                                        height: '30px',
                                                                                        objectFit: 'cover'
                                                                                    }}
                                                                                    onError={(e) => {
                                                                                        e.target.src = getInitialsImage(comment.name);
                                                                                    }}
                                                                                />
                                                                            </Link>
                                                                            <div className="comment-content">
                                                                                <strong className="comment-user-name">{comment.name}</strong>
                                                                                <p className="comment-text">
                                                                                    {formatTextWithLinks(comment.comment)}
                                                                                </p>
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
                                                                                    title="Deletar comentário"
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
                                                        <p className="text-muted text-center no-comments">Nenhum comentário ainda</p>
                                                    )}
                                                    
                                                    {isCommentsLoading && postComments.length > 0 && (
                                                        <p className="text-center">Carregando mais comentários...</p>
                                                    )}
                                                </div>

                                                <div className="add-comment-form">
                                                    <div className="comment-input-container">
                                                        <Input
                                                            type="textarea"
                                                            value={currentCommentText}
                                                            onChange={e => handleCommentTextChange(post.post_id, e.target.value)}
                                                            placeholder="Escreva um comentário..."
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
                                                            {isCommenting ? '...' : 'Publicar'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {exploreLoading && <p className="text-center">Carregando...</p>}
                            <br/>
                            {!exploreHasMore && <p className="text-center text-muted">Não há mais posts</p>}
                        </>
                    )}
                    
                    <div style={{ height: '80px' }}></div>
                </div>
            </div>
            
            {/* Modal de imagem */}
            {renderImageModal()}
            
            <Footer showOnScroll={true} />
            <Footer showOnScroll={false} />
        </div>
    );
}