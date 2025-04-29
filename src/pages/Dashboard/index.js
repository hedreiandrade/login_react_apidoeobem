import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SocialHeader from '../../components/SocialHeader';
import { Alert, Button, Input } from 'reactstrap';
import { apiFeed } from '../../services/api';
import '../../styles/Dashboard.css';
import { useExpireToken } from "../../hooks/expireToken";
import { getInitialsImage } from "../../ultils/initialsImage";

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
    const observer = useRef();
    const [resetFeedTrigger, setResetFeedTrigger] = useState(0);
    const userId = localStorage.getItem('user_id');
    const name = localStorage.getItem('name') || 'User';
    const rawPhoto = localStorage.getItem('photo');
    const token = localStorage.getItem('login_token');

    const isValidPhoto = (photo) => {
        return photo && photo.trim() !== '' && photo !== 'null' && photo !== 'undefined';
    };

    const user = {
        photo: isValidPhoto(rawPhoto) ? rawPhoto : getInitialsImage(name)
    };

    const fetchFeed = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiFeed.get(`/feed/${userId}/${page}/5`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
    
            if (response.data.data.length > 0) {
                setFeed(prev => {
                    const existingIds = new Set(prev.map(post => post.post_id));
                    const newPosts = response.data.data.filter(post => !existingIds.has(post.post_id));
                    return [...prev, ...newPosts];
                });
            }
    
            if (page >= response.data.last_page) {
                setHasMore(false);
            }
        } catch (err) {
            setError('Failed to load feed');
        } finally {
            setLoading(false);
        }
    }, [userId, token, page]);    

    useEffect(() => {
        if (hasMore) {
            fetchFeed();
        }
    }, [fetchFeed, hasMore, resetFeedTrigger]);

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

    const handleMediaChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setMediaFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handlePost = async () => {
        if (!description.trim() && !mediaFile) return;
    
        setPosting(true);
        try {
            let mediaLink = '';
            if (mediaFile) {
                mediaLink = previewUrl;
            }
    
            await apiFeed.post('/posts', {
                user_id: userId,
                description,
                media_link: mediaLink
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
    
            setDescription('');
            setMediaFile(null);
            setPreviewUrl(null);
            setFeed([]);           
            setPage(1);             
            setHasMore(true);       
            setResetFeedTrigger(prev => prev + 1); 
        } catch (err) {
            setError('Failed to create post');
        } finally {
            setPosting(false);
        }
    };    

    const renderMedia = (url) => {
        if (!url || typeof url !== 'string') return null;
    
        const isVideo = url.toLowerCase().match(/\.(mp4|webm|ogg)$/);
        const isImage = url.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/);
    
        if (isVideo) {
            return <video src={url} controls className="post-media" />;
        } else if (isImage) {
            return <img src={url} alt="Post media" className="post-media" />;
        }
        return null;
    };

    return (
        <div>
            <SocialHeader user={user} />
            <div className="col-md-6 App-feed">
                <div className="feed-container">
                    <Header title="Feed" />
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
                    {error && <Alert color="danger" className="text-center">{error}</Alert>}
                    {feed.map((post, index) => {
                        const isLast = index === feed.length - 1;
                        const photo = isValidPhoto(post.photo)
                            ? post.photo
                            : getInitialsImage(post.name);
                        return (
                            <div
                                key={post.post_id}
                                ref={isLast ? lastPostRef : null}
                                className="post-item"
                            >
                                <div className="post-header">
                                    <img src={photo} alt={post.name} className="post-user-photo" />
                                    <strong className="post-user-name">{post.name}</strong>
                                </div>
                                <p className="post-description">{post.description}</p>
                                {renderMedia(post.media_link)}
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