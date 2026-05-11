import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Button, Input, Alert } from 'reactstrap';
import { apiFeed } from '../../services/api';
import { useExpireToken } from "../../hooks/expireToken";
import { getInitialsImage } from "../../ultils/initialsImage";
import { getVerifyToken } from "../../ultils/verifyToken";
import SocialHeader from '../../components/SocialHeader';
import Footer from '../../components/Footer';
import '../../styles/Post.css';

export default function PostsPage() {
    useExpireToken();
    const history = useHistory();
    const { id } = useParams(); // Captura o parâmetro id da URL

    // Redireciona se estiver na rota /profile/:id
    useEffect(() => {
        if (id && history.location.pathname.startsWith('/profile/')) {
            // Redireciona para /profile/id
            history.push(`/profile/${id}`);
        }
    }, [id, history]);

    const [description, setDescription] = useState('');
    const [mediaFile, setMediaFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState('');
    
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

    // Função para formatar texto com links clicáveis (para preview)
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

    // Limpar URL de preview
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

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
                            maxHeight: '400px',
                            objectFit: 'contain',
                            backgroundColor: '#000'
                        }}
                        onError={(e) => {
                            console.error('Error loading video:', url);
                            e.target.style.display = 'none';
                        }}
                    >
                        <source src={url} type="video/mp4" />
                        <source src={url} type="video/webm" />
                        <source src={url} type="video/ogg" />
                        Your browser does not support the video tag.
                    </video>
                </div>
            );
        } else if (isImage) {
            return (
                <img 
                    src={url} 
                    alt="Post preview" 
                    className="post-media"
                    style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '400px',
                        objectFit: 'contain'
                    }}
                    loading="lazy"
                    onError={(e) => {
                        console.error('Error loading image:', url);
                        e.target.style.display = 'none';
                    }}
                />
            );
        }
        return null;
    }, []);

    const handleMediaChange = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        
        setMediaFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    }, [previewUrl]);

    const handlePost = useCallback(async () => {
        if (!description.trim() && !mediaFile) {
            setError('Please add a description or media to post');
            return;
        }
        
        setPosting(true);
        setError('');
        
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
            } else {
                // Limpar formulário
                setDescription('');
                setMediaFile(null);
                
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                }
                
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                
                // Redirecionar para o feed após postar
                history.push('/feed');
            }
        } catch (err) {
            setError('Failed to create post');
        } finally {
            setPosting(false);
        }
    }, [description, mediaFile, token, userId, previewUrl, history]);

    return (
        <div>
            <SocialHeader user={user} />
            <div className="col-md-6 App-posts">
                <div className="posts-container">
                    {error && <Alert color="danger" fade={false} className="text-center">{error}</Alert>}
                    
                    <div className="create-post-full">
                        <div className="user-info-section">
                            <img 
                                src={user.photo} 
                                alt="User" 
                                className="post-user-photo-large"
                                style={{
                                    width: '50px',
                                    height: '50px',
                                    objectFit: 'cover',
                                    borderRadius: '50%'
                                }}
                                onError={(e) => {
                                    e.target.src = getInitialsImage(name);
                                }}
                            />
                            <div className="user-name-label">
                                <strong>{name}</strong>
                            </div>
                        </div>
                        
                        <Input
                            type="textarea"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="What's on your mind?"
                            className="post-input-large"
                            rows="4"
                        />
                        
                        <div className="media-upload-section">
                            <Input
                                type="file"
                                accept="image/*,video/*"
                                onChange={handleMediaChange}
                                className="post-file-input"
                                innerRef={fileInputRef}
                            />
                            
                            {previewUrl && (
                                <div className="preview-container-full">
                                    {renderMedia(previewUrl, true)}
                                    <Button 
                                        color="danger" 
                                        size="sm"
                                        className="remove-preview-btn"
                                        onClick={() => {
                                            if (previewUrl) {
                                                URL.revokeObjectURL(previewUrl);
                                                setPreviewUrl(null);
                                                setMediaFile(null);
                                                if (fileInputRef.current) {
                                                    fileInputRef.current.value = '';
                                                }
                                            }
                                        }}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            )}
                        </div>
                        
                        {/* Preview do texto com links */}
                        {description && (
                            <div className="text-preview">
                                <small className="text-muted">Preview:</small>
                                <div className="preview-text">
                                    {formatTextWithLinks(description)}
                                </div>
                            </div>
                        )}
                        
                        <div className="post-actions-full">
                            <Button 
                                color="primary" 
                                onClick={handlePost} 
                                disabled={posting || (!description.trim() && !mediaFile)}
                                className="submit-post-btn"
                                size="lg"
                            >
                                {posting ? 'Posting...' : 'Post'}
                            </Button>
                            
                            <Button 
                                color="secondary" 
                                onClick={() => history.push('/feed')}
                                className="cancel-post-btn"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
                
                {/* Espaço extra para não ficar coberto pelo footer */}
                <div style={{ height: '80px' }}></div>
            </div>
            
            <Footer showOnScroll={true} />
            <Footer showOnScroll={false} />
        </div>
    );
}