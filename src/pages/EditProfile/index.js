import React, { useState, useEffect } from 'react';
import { Form, FormGroup, Label, Input, Button, Alert } from 'reactstrap';
import Header from '../../components/Header';
import { api } from '../../services/api';
import '../../styles/EditProfile.css';
import { useExpireToken } from "../../hooks/expireToken";
import SocialHeader from '../../components/SocialHeader';
import Footer from '../../components/Footer';

export default function EditProfile() {
    useExpireToken();

    const user = {
        photo: localStorage.getItem('photo')
    };

    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        name: '',
        photo: null,
        photoPreview: null
    });

    useEffect(() => {
        async function fetchUserData() {
            try {
                const token = localStorage.getItem('login_token');
                const userId = localStorage.getItem('user_id');
                if (!token || !userId) {
                    setMessage('Token or user ID not found');
                    return;
                }
                const response = await api.get(`/user/${userId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const { name, photo } = response.data;
                setFormData({
                    name,
                    photo: null, //photo ... testar
                    photoPreview: photo
                });
            } catch (error) {
                setMessage('Error fetching user data');
            }
        }
        fetchUserData();
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

        setErrors(errors);
        return isValid;
    };

    const updateProfile = async () => {
        if (!validateFields()) return;
        const token = localStorage.getItem('login_token');
        const userId = localStorage.getItem('user_id');
        const data = new FormData();
        data.append('name', formData.name);
        if (formData.photo) {
            data.append('photo', formData.photo);
        }
        try {
            const response = await api.post(`/user/${userId}`, data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            localStorage.setItem('photo', response.data.photo);
            console.log(response);
        } catch (error) {
            console.log(error);
            setMessage('Error updating profile');
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
                        />
                        {errors.name && <Label className="text-danger">{errors.name}</Label>}
                    </FormGroup>
                    <FormGroup>
                        <Label for="photo">Profile Photo</Label>
                        <Input type="file" id="photo" name="photo" onChange={handleFileChange} />
                        {formData.photoPreview && (
                            <div className="photo-preview-container">
                                <img src={formData.photoPreview} alt="Profile Preview" className="photo-preview" />
                            </div>
                        )}
                    </FormGroup>
                    <div className="button-container">
                        <Button color="primary" className="align-button" onClick={updateProfile} style={{ marginRight: "10px" }}>
                            Update profile
                        </Button>
                        <Button color="secondary" className="align-button">
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
