import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Button, Input, Alert } from 'reactstrap';
import { apiFeed } from '../../services/api';
import { useExpireToken } from "../../hooks/expireToken";
import { getInitialsImage } from "../../ultils/initialsImage";
import { getVerifyToken } from "../../ultils/verifyToken";
import SocialHeader from '../../components/SocialHeader';
import Footer from '../../components/Footer';
import { FaImage } from "react-icons/fa";
import '../../styles/Post.css';

export default function PostsPage() {
    useExpireToken();
    const history = useHistory();
    const { id } = useParams();

    useEffect(() => {
        if (id && history.location.pathname.startsWith('/profile/')) {
            history.push(`/profile/${id}`);
        }
    }, [id, history]);

    const [description, setDescription] = useState('');
    const [mediaFile, setMediaFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [mediaType, setMediaType] = useState(null);
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

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const renderMedia = useCallback((url, fileType) => {
        if (!url) return null;

        const isVideo = fileType && fileType.startsWith('video/');
        const isImage = fileType && fileType.startsWith('image/');

        if (isVideo) {
            return (
                <div className="video-container" style={{ position: 'relative', width: '100%', marginTop: '15px' }}>
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
                            backgroundColor: '#000',
                            borderRadius: '8px'
                        }}
                        onError={(e) => {
                            console.error('Error loading video:', url);
                            e.target.style.display = 'none';
                        }}
                    >
                        <source src={url} type={fileType} />
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
                        objectFit: 'contain',
                        marginTop: '15px',
                        borderRadius: '8px'
                    }}
                    loading="lazy"
                    onError={(e) => {
                        console.error('Error loading image:', url);
                        e.target.style.display = 'none';
                    }}
                />
            );
        }
        return <p>Formato de arquivo não suportado</p>;
    }, []);

    const handleMediaChange = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        
        const newPreviewUrl = URL.createObjectURL(file);
        setMediaFile(file);
        setPreviewUrl(newPreviewUrl);
        setMediaType(file.type);
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
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
                setDescription('');
                setMediaFile(null);
                setMediaType(null);
                
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                }
                
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                
                history.push('/feed');
            }
        } catch (err) {
            setError('Failed to create post');
        } finally {
            setPosting(false);
        }
    }, [description, mediaFile, token, userId, previewUrl, history]);

    const triggerFileInput = useCallback(() => {
        fileInputRef.current.click();
    }, []);

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
                                style={{ display: 'none' }}
                            />
                            
                            <div 
                                onClick={triggerFileInput}
                                style={{
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '10px',
                                    backgroundColor: '#f0f2f5',
                                    borderRadius: '8px',
                                    transition: 'all 0.3s',
                                    width: '44px',
                                    height: '44px'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#e4e6e9';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f0f2f5';
                                }}
                            >
                                <FaImage size={24} />
                            </div>
                        </div>

                        {description && (
                            <div className="text-preview" style={{ marginTop: '15px' }}>
                                <small className="text-muted">Preview:</small>
                                <div className="preview-text" style={{
                                    padding: '10px',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '8px',
                                    marginTop: '5px'
                                }}>
                                    {formatTextWithLinks(description)}
                                </div>
                                {previewUrl && mediaType && (
                                    <div className="preview-container-full" style={{ marginTop: '15px' }}>
                                        {renderMedia(previewUrl, mediaType)}
                                        <Button 
                                            color="danger" 
                                            size="sm"
                                            className="remove-preview-btn"
                                            onClick={() => {
                                                if (previewUrl) {
                                                    URL.revokeObjectURL(previewUrl);
                                                    setPreviewUrl(null);
                                                    setMediaFile(null);
                                                    setMediaType(null);
                                                    if (fileInputRef.current) {
                                                        fileInputRef.current.value = '';
                                                    }
                                                }
                                            }}
                                            style={{ marginTop: '10px' }}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Botões de ação */}
                        <div className="post-actions-full" style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <Button 
                                color="primary" 
                                onClick={handlePost} 
                                disabled={posting || (!description.trim() && !mediaFile)}
                                className="submit-post-btn"
                                style={{ flex: 1 }}
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
                
                <div style={{ height: '80px' }}></div>
            </div>
            
            <Footer showOnScroll={true} />
            <Footer showOnScroll={false} />
        </div>
    );
}