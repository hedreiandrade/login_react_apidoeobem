import React, { useEffect, useState, useRef, useCallback } from 'react';
import SocialHeader from '../../components/SocialHeader';
import Footer from '../../components/Footer'; // Importação mantida
import { Alert, Spinner } from 'reactstrap';
import { apiFeed } from '../../services/api';
import '../../styles/Search.css';
import { useExpireToken } from "../../hooks/expireToken";
import { getInitialsImage } from "../../ultils/initialsImage";
import { useHistory, Link } from 'react-router-dom';
import { getVerifyToken } from "../../ultils/verifyToken";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import { FaPlay, FaSearch } from "react-icons/fa";

export default function Search() {
    const history = useHistory();
    useExpireToken();

    // Estados da busca de usuários
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState('');
    const [initialLoad, setInitialLoad] = useState(false);
    const [totalPages, setTotalPages] = useState(0);
    
    // Estados do Mural (Explore)
    const [muralPosts, setMuralPosts] = useState([]);
    const [muralPage, setMuralPage] = useState(1);
    const [muralHasMore, setMuralHasMore] = useState(true);
    const [muralLoading, setMuralLoading] = useState(false);

    const observer = useRef();
    const muralObserver = useRef();

    const name = localStorage.getItem('name') || 'User';
    const rawPhoto = localStorage.getItem('photo');

    const isValidPhoto = (photo) => {
        return photo && photo.trim() !== '' && photo !== 'null' && photo !== 'undefined';
    };

    const user = {
        photo: isValidPhoto(rawPhoto) ? rawPhoto : getInitialsImage(name)
    };

    // --- BUSCA DE USUÁRIOS ---
    const performSearch = useCallback(async (term, pageNum = 1, append = false) => {
        if (!term.trim()) {
            setSearchResults([]);
            setHasMore(false);
            setInitialLoad(false);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('login_token');
            const isValid = await getVerifyToken(token);
            if (!isValid) {
                window.location.href = "/";
                return;
            }
            const userId = parseInt(localStorage.getItem('user_id'));
            const response = await apiFeed.get(`/search/${userId}/${encodeURIComponent(term)}/${pageNum}/5`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data && response.data.data) {
                if (append) {
                    setSearchResults(prev => {
                        const existingIds = new Set(prev.map(u => u.id || u.user_id));
                        const newUniqueUsers = response.data.data.filter(u => 
                            !existingIds.has(u.id || u.user_id)
                        );
                        return [...prev, ...newUniqueUsers];
                    });
                } else {
                    setSearchResults(response.data.data);
                }
                setTotalPages(response.data.last_page || 1);
                setHasMore(pageNum < (response.data.last_page || 1));
                setInitialLoad(true);
            }
        } catch (err) {
            setError('Failed to load search results');
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.trim()) {
                setPage(1);
                performSearch(searchTerm, 1, false);
            } else {
                setSearchResults([]);
                setInitialLoad(false);
                setHasMore(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, performSearch]);

    useEffect(() => {
        if (page > 1 && searchTerm.trim() && hasMore) {
            performSearch(searchTerm, page, true);
        }
    }, [page, searchTerm, hasMore, performSearch]);

    const lastResultRef = useCallback(node => {
        if (loading || !hasMore) {
            if (observer.current) observer.current.disconnect();
            return;
        }
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !loading) {
                setPage(prevPage => prevPage + 1);
            }
        }, { threshold: 0.5, rootMargin: '100px' });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setPage(1);
        setSearchResults([]);
        setHasMore(false);
        setInitialLoad(false);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        setSearchResults([]);
        setInitialLoad(false);
        setPage(1);
        setHasMore(false);
    };

    // --- MURAL DE POSTS ---
    const fetchMural = useCallback(async (pageNum = muralPage) => {
        if (muralLoading) return;
        setMuralLoading(true);
        try {
            const token = localStorage.getItem('login_token');
            const isValid = await getVerifyToken(token);
            if (!isValid) {
                window.location.href = "/";
                return;
            }

            const response = await apiFeed.get(`/searchMural/${pageNum}/12`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data && response.data.data) {
                setMuralPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.post_id));
                    const newPosts = response.data.data.filter(p => !existingIds.has(p.post_id));
                    return [...prev, ...newPosts];
                });
                
                if (pageNum >= (response.data.last_page || 1)) {
                    setMuralHasMore(false);
                }
            }
        } catch (err) {
            console.error("Erro ao carregar mural:", err);
        } finally {
            setMuralLoading(false);
        }
    }, [muralPage, muralLoading]);

    useEffect(() => {
        if (muralHasMore) {
            fetchMural(muralPage);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [muralPage]);

    const lastMuralRef = useCallback(node => {
        if (muralLoading) return;
        if (muralObserver.current) muralObserver.current.disconnect();

        requestAnimationFrame(() => {
            muralObserver.current = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting && muralHasMore) {
                    setMuralPage(prev => prev + 1);
                }
            }, { rootMargin: '300px', threshold: 0.1 });
            if (node) muralObserver.current.observe(node);
        });
    }, [muralLoading, muralHasMore]);

    const handleOpenMuralPost = (index) => {
        history.push({
            pathname: '/reels-search',
            state: { initialPosts: muralPosts, startIndex: index }
        });
    };

    const isVideoMedia = (link) => {
        if (!link) return false;
        return link.match(/\.(mp4|webm|ogg|mov)$/i) || link.includes('video');
    };

    return (
        <div className="search-page-wrapper">
            <SocialHeader user={user} />
            
            {/* Barra de Busca Fixa no Topo */}
            <div className="search-top-bar">
                <div className="search-input-wrapper">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        className="search-input-custom"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                    {searchTerm && (
                        <button className="clear-btn-custom" type="button" onClick={handleClearSearch}>
                            ×
                        </button>
                    )}
                </div>
            </div>

            <div className="search-content-area">
                {/* Resultados de busca de usuários */}
                {searchTerm && (
                    <div className="user-search-results">
                        {error && <Alert color="danger">{error}</Alert>}
                        
                        {initialLoad && searchResults.length > 0 && (
                            <div className="search-info mb-2 px-3">
                                <small className="text-muted">
                                    Found {searchResults.length} results 
                                    {totalPages > 1 && ` • Page ${page} of ${totalPages}`}
                                </small>
                            </div>
                        )}

                        {initialLoad && searchResults.length === 0 && !loading && (
                            <Alert color="info" fade={false} className="text-center mx-3 mt-3">No users found for "{searchTerm}"</Alert>
                        )}
                        
                        {searchResults.map((user, index) => {
                            const isLastItem = index === searchResults.length - 1;
                            const userPhoto = isValidPhoto(user.photo) ? user.photo : getInitialsImage(user.name);
                            return (
                                <div key={`${user.id || user.user_id}-${index}`} ref={isLastItem ? lastResultRef : null} className="search-result-item">
                                    <Link to={`/profile/${user.id || user.user_id}`} className="search-result-link">
                                        <img src={userPhoto} alt={user.name} className="search-result-photo" />
                                        <div className="search-result-info">
                                            <div className="search-result-header">
                                                <span className="search-result-name">{user.name}</span>
                                                {user.verified_profile === true && <RiVerifiedBadgeFill className="verified-badge" size={14} />}
                                            </div>
                                            {user.email && <span className="search-result-email">{user.email}</span>}
                                        </div>
                                    </Link>
                                </div>
                            );
                        })}
                        {loading && <div className="text-center py-2"><Spinner size="sm" color="primary" /> Loading users...</div>}
                    </div>
                )}

                {/* Mural de Posts (Explore) - 100% Width */}
                {!searchTerm && (
                    <div className="search-mural-grid">
                        {muralPosts.map((post, index) => {
                            const isLast = index === muralPosts.length - 1;
                            const isVideo = isVideoMedia(post.media_link);
                            
                            return (
                                <div 
                                    key={post.post_id} 
                                    className="mural-item"
                                    ref={isLast ? lastMuralRef : null}
                                    onClick={() => handleOpenMuralPost(index)}
                                >
                                    {isVideo ? (
                                        <>
                                            <video src={post.media_link} className="mural-media" muted />
                                            <div className="mural-video-icon"><FaPlay size={20} color="#fff" /></div>
                                        </>
                                    ) : (
                                        <img src={post.media_link} className="mural-media" alt="Post" loading="lazy" />
                                    )}
                                </div>
                            );
                        })}
                        
                        {muralLoading && (
                            <div className="w-100 text-center py-4" style={{ gridColumn: '1 / -1' }}>
                                <Spinner color="primary" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* RODAPÉ ADICIONADO AQUI */}
            <Footer />
        </div>
    );
}