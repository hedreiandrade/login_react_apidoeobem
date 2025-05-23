import React, { useState, useEffect } from 'react';
import { Form, FormGroup, Label, Input, Button, Alert } from 'reactstrap';
import Header from '../../components/Header';
import { api } from '../../services/api';
import '../../styles/EditProfile.css';
import { useExpireToken } from "../../hooks/expireToken";
import SocialHeader from '../../components/SocialHeader';
import Footer from '../../components/Footer';
import { useHistory } from 'react-router-dom';
import { getInitialsImage } from "../../ultils/initialsImage";
import { getVerifyToken } from "../../ultils/verifyToken";

export default function EditProfile() {
    const history = useHistory();
    if(localStorage.getItem('login_token') === null || localStorage.getItem('login_token') === ''){
        history.push("/");
    }

    useExpireToken();

    const redirectToChangePassword = () => {
        history.push('/change-password');
    };

    const name = localStorage.getItem('name') || 'User';
    const rawPhoto = localStorage.getItem('photo');

    const isValidPhoto = (photo) => {
        return photo && photo.trim() !== '' && photo !== 'null' && photo !== 'undefined';
    };

    const user = {
        photo: isValidPhoto(rawPhoto) ? rawPhoto : getInitialsImage(name)
    };

    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        name: '',
        photo: null,
        photoPreview: null,
        email: '',
    });

    useEffect(() => {
        let isMounted = true;
    
        async function fetchUserData() {
            try {
                const token = localStorage.getItem('login_token');
                const userId = localStorage.getItem('user_id');
                if (!token || !userId) {
                    if (isMounted) setMessage('Token or user ID not found');
                    return;
                }
                const response = await api.get(`/user/${userId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const { name, photo, email } = response.data;
    
                if (isMounted) {
                    setFormData({
                        name,
                        photo: null,
                        photoPreview: isValidPhoto(photo) ? photo : getInitialsImage(name),
                        email,
                    });
                }
            } catch (error) {
                if (isMounted) setMessage('Error fetching user data');
            }
        }
    
        fetchUserData();
    
        return () => {
            isMounted = false;
        };
    }, []);    

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
        setErrors(prevErrors => ({
            ...prevErrors,
            [name]: ''
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prevState => ({
                    ...prevState,
                    photo: file,
                    photoPreview: reader.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const validateFields = () => {
        let errors = {};
        let isValid = true;

        if (!formData.name) {
            errors.name = 'Field is required';
            isValid = false;
        }

        if (!formData.email) {
            errors.email = 'Field is required';
            isValid = false;
        }

        setErrors(errors);
        return isValid;
    };

    const updateProfile = async () => {
        if (!validateFields()) return;
        const token = localStorage.getItem('login_token');
        const userId = localStorage.getItem('user_id');
        const data = new FormData();
        data.append('name', formData.name);
        data.append('email', formData.email);
        if (formData.photo) {
            data.append('photo', formData.photo);
        }
        try {
            const isValid = await getVerifyToken(token);
            if (!isValid) {
                window.location.href = "/";
                return;
            }
            const response = await api.post(`/user/${userId}`, data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            if (response.status === 203) {
                setMessage('There is an account for this e-mail, try to recover your password.');
            } else {
                localStorage.setItem('photo', response.data.photo);
                window.location.reload();
            }
        } catch (error) {
            setMessage('Update profile have error');
        }
    };

    return (
        <div>
            <SocialHeader user={user} />
            <div className="col-md-6 App">
                <Header title="Edit Profile" />
                <hr className="my-3" />
                {message && <Alert color="danger" className="text-center" fade={false}>{message}</Alert>}
                <Form>
                    <FormGroup>
                        <Label for="name">Name</Label>
                        <Input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Type your name"
                            autoFocus
                        />
                        {errors.name && <Label className="text-danger">{errors.name}</Label>}
                    </FormGroup>
                    <FormGroup>
                        <Label for="photo">Profile photo</Label>
                        <Input type="file" id="photo" name="photo" onChange={handleFileChange} />
                        {formData.photoPreview && (
                            <div className="photo-preview-container">
                                <img src={formData.photoPreview} alt="Profile Preview" className="photo-preview" />
                            </div>
                        )}
                    </FormGroup>
                    <FormGroup>
                        <Label for="email">Email</Label>
                        <Input
                            type="text"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Type your email"
                        />
                        {errors.email && <Label className="text-danger">{errors.email}</Label>}
                    </FormGroup>
                    <div className="button-container">
                        <Button color="primary" className="align-button" onClick={updateProfile} style={{ marginRight: "10px" }}>
                            Update profile
                        </Button>
                        <Button color="secondary" className="align-button" onClick={redirectToChangePassword}>
                            Change password
                        </Button>
                    </div>
                    <br />
                    <br />
                    <br />
                </Form>
            </div>
            <Footer />
        </div>
    );
}