import React, { useState } from 'react';
import { Form, FormGroup, Label, Input, Button, Alert } from 'reactstrap';
import Header from '../../components/Header';
import { api } from '../../services/api';
import '../../styles/EditProfile.css';
import { useExpireToken } from "../../hooks/expireToken";
import SocialHeader from '../../components/SocialHeader';
import Footer from '../../components/Footer';
import { useHistory } from 'react-router-dom';
import {getInitialsImage} from "../../ultils/initialsImage";

export default function ChangePassword() {
    useExpireToken();
    const history = useHistory();

    const redirectToEdit = () => {
        history.push('/edit-profile');
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
        email: '',
        password: '',
        newPassword: '',
        confirmNewPassword: ''
    });

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

    const validateFields = () => {
        let errors = {};
        let isValid = true;
    
        if (!formData.email) {
            errors.email = 'Current email is required';
            isValid = false;
        }
    
        if (!formData.password) {
            errors.password = 'Current password is required';
            isValid = false;
        }
    
        if (!formData.newPassword) {
            errors.newPassword = 'New password is required';
            isValid = false;
        } else if (formData.newPassword.length < 8) {
            errors.newPassword = 'Password must be at least 8 characters';
            isValid = false;
        } else {
            const hasNumber = /\d/.test(formData.newPassword);
            const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword); 
            if (!hasNumber) {
                errors.newPassword = 'Enter a stronger password, with uppercase letters, lowercase letters, numbers and a special character.';
                isValid = false;
            } else if (!hasSpecialChar) {
                errors.newPassword = 'Enter a stronger password, with uppercase letters, lowercase letters, numbers and a special character.';
                isValid = false;
            }
        }
    
        if (!formData.confirmNewPassword) {
            errors.confirmNewPassword = 'Confirm new password is required';
            isValid = false;
        } else if (formData.newPassword !== formData.confirmNewPassword) {
            errors.confirmNewPassword = 'Passwords do not match';
            isValid = false;
        }
    
        setErrors(errors);
        return isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateFields()) return;

        const token = localStorage.getItem('login_token');
        try {
            const response = await api.post(`/changePassword`, {
                email: formData.email,
                password: formData.password,
                newPassword: formData.newPassword,
                confirmNewPassword: formData.confirmNewPassword
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.status === 201) {
                setMessage('Password updated successfully');
                setTimeout(() => {
                    history.push("/edit-profile");
                }, 2000); // Redireciona após 2 segundos
            } else {
                setMessage(response.data.response || 'Error updating password');
            }
        } catch (error) {
            console.log(error);
            setMessage('Error updating password');
        }
    };

    return (
        <div>
            <SocialHeader user={user} />
            <div className="col-md-6 App">
                <Header title="Change Password" />
                <hr className="my-3" />
                {message && <Alert color={message.includes('successfully') ? 'success' : 'danger'} className="text-center" fade={false}>{message}</Alert>}
                <Form onSubmit={handleSubmit}>
                    <FormGroup>
                        <Label for="email">Current email</Label>
                        <Input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Type your current email"
                            autoFocus
                        />
                        {errors.email && <Label className="text-danger">{errors.email}</Label>}
                    </FormGroup>
                    <FormGroup>
                        <Label for="password">Current password</Label>
                        <Input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Type your current password"
                        />
                        {errors.password && <Label className="text-danger">{errors.password}</Label>}
                    </FormGroup>
                    <FormGroup>
                        <Label for="newPassword">New password</Label>
                        <Input
                            type="password"
                            id="newPassword"
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleChange}
                            placeholder="Type your new password"
                        />
                        {errors.newPassword && <Label className="text-danger">{errors.newPassword}</Label>}
                    </FormGroup>
                    <FormGroup>
                        <Label for="confirmNewPassword">Confirm new password</Label>
                        <Input
                            type="password"
                            id="confirmNewPassword"
                            name="confirmNewPassword"
                            value={formData.confirmNewPassword}
                            onChange={handleChange}
                            placeholder="Confirm your new password"
                        />
                        {errors.confirmNewPassword && <Label className="text-danger">{errors.confirmNewPassword}</Label>}
                    </FormGroup>
                    <div className="button-container">
                        <Button color="primary" className="align-button" type="submit">
                            Update password
                        </Button>
                        <Button color="secondary" className="align-button" onClick={redirectToEdit}>
                            Back to edit
                        </Button>
                    </div>
                </Form>
            </div>
            <br />
            <br />
            <br />
            <Footer />
        </div>
    );
}