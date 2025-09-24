import React, { useEffect, useState, useRef, useCallback } from 'react';
import SocialHeader from '../../components/SocialHeader';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Alert, Spinner } from 'reactstrap';
import { apiFeed } from '../../services/api';
import '../../styles/Search.css';
import { useExpireToken } from "../../hooks/expireToken";
import { getInitialsImage } from "../../ultils/initialsImage";
import { useHistory, Link } from 'react-router-dom';
import { getVerifyToken } from "../../ultils/verifyToken";

export default function Search() {
    const history = useHistory();

    if(localStorage.getItem('login_token') === null || localStorage.getItem('login_token') === ''){
        history.push("/");
    }
    useExpireToken();

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState('');
    const [initialLoad, setInitialLoad] = useState(false);
    const [totalPages, setTotalPages] = useState(0);
    const observer = useRef();

    const name = localStorage.getItem('name') || 'User';
    const rawPhoto = localStorage.getItem('photo');

    const isValidPhoto = (photo) => {
        return photo && photo.trim() !== '' && photo !== 'null' && photo !== 'undefined';
    };

    const user = {
        photo: isValidPhoto(rawPhoto) ? rawPhoto : getInitialsImage(name)
    };

    // Função para realizar a busca
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

            const response = await apiFeed.get(`/search/${encodeURIComponent(term)}/${pageNum}/5`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data && response.data.data) {
                if (append) {
                    // Para carregamento adicional, verifica duplicatas
                    setSearchResults(prev => {
                        const existingIds = new Set(prev.map(u => u.id || u.user_id));
                        const newUniqueUsers = response.data.data.filter(u => 
                            !existingIds.has(u.id || u.user_id)
                        );
                        return [...prev, ...newUniqueUsers];
                    });
                } else {
                    // Primeira página - substitui os resultados
                    setSearchResults(response.data.data);
                }

                // Controle de paginação
                setTotalPages(response.data.last_page || 1);
                
                if (pageNum >= (response.data.last_page || 1)) {
                    setHasMore(false);
                } else {
                    setHasMore(true);
                }
                
                setInitialLoad(true);
            }
        } catch (err) {
            setError('Failed to load search results');
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounce para busca inicial
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

    // Carregar próxima página quando a página mudar
    useEffect(() => {
        if (page > 1 && searchTerm.trim() && hasMore) {
            performSearch(searchTerm, page, true);
        }
    }, [page, searchTerm, hasMore, performSearch]);

    // Observer para infinite scroll - MAIS CONSERVADOR
    const lastResultRef = useCallback(
        node => {
            if (loading || !hasMore) {
                if (observer.current) observer.current.disconnect();
                return;
            }
            
            if (observer.current) observer.current.disconnect();
            
            observer.current = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    setPage(prevPage => prevPage + 1);
                }
            }, {
                threshold: 0.5, // Só dispara quando 50% do elemento estiver visível
                rootMargin: '100px' // Carrega 100px antes de chegar no final
            });
            
            if (node) observer.current.observe(node);
        },
        [loading, hasMore]
    );

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

    // Reset quando o termo de busca ficar vazio
    useEffect(() => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            setInitialLoad(false);
            setHasMore(false);
            setPage(1);
        }
    }, [searchTerm]);

    return (
        <div>
            <SocialHeader user={user} />
            <div className="col-md-6 App">
                <div className="search-container">
                    <Header title="Search" />
                    <hr className="my-3" />
                    
                    {/* Campo de busca */}
                    <br/>
                    <div className="search-input-container">
                        <div className="input-group">
                            <input
                                type="text"
                                className="form-control search-input"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                autoFocus
                            />
                            {searchTerm && (
                                <button
                                    className="btn btn-outline-secondary clear-btn"
                                    type="button"
                                    onClick={handleClearSearch}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Informações da busca */}
                    {initialLoad && searchResults.length > 0 && (
                        <div className="search-info">
                            <small className="text-muted">
                                Found {searchResults.length} results 
                                {totalPages > 1 && ` • Page ${page} of ${totalPages}`}
                            </small>
                        </div>
                    )}

                    {/* Resultados da busca */}
                    {initialLoad && searchResults.length === 0 && !loading && (
                        <Alert color="info" fade={false} className="text-center">
                            No results found for "{searchTerm}"
                        </Alert>
                    )}

                    {searchResults.map((user, index) => {
                        const isLastItem = index === searchResults.length - 1;
                        const userPhoto = isValidPhoto(user.photo)
                            ? user.photo
                            : getInitialsImage(user.name);
                        
                        return (
                            <div
                                key={`${user.id || user.user_id}-${index}`}
                                ref={isLastItem ? lastResultRef : null}
                                className="search-result-item"
                            >
                                <Link to={`/profile/${user.id || user.user_id}`} className="search-result-link">
                                    <img
                                        src={userPhoto}
                                        alt={user.name}
                                        className="search-result-photo"
                                    />
                                    <div className="search-result-info">
                                        <span className="search-result-name">{user.name}</span>
                                        {user.email && (
                                            <span className="search-result-email">{user.email}</span>
                                        )}
                                    </div>
                                </Link>
                            </div>
                        );
                    })}

                    {loading && (
                        <div className="text-center py-3">
                            <Spinner color="primary" size="sm" />
                            <span className="ms-2">
                                {page === 1 ? 'Searching...' : 'Loading more...'}
                            </span>
                        </div>
                    )}

                    {error && (
                        <Alert color="danger" fade={false} className="text-center">
                            {error}
                        </Alert>
                    )}

                    {!hasMore && searchResults.length > 0 && (
                        <p className="text-center text-muted py-3">
                            {searchResults.length >= 5 ? 'No more results' : 'End of results'}
                        </p>
                    )}

                    <br />
                    <br />
                </div>
            </div>
            <Footer />
        </div>
    );
}