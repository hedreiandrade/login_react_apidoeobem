import React, { useState, useEffect, useCallback } from 'react';
import { Form, FormGroup, Label, Input, Button, Alert, Spinner } from 'reactstrap';
import { useHistory, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import '../../styles/EditProfile.css';

export default function ResetPassword() {
    const history = useHistory();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState({});
    
    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    // Extract token and email from URL using useCallback to avoid circular dependency
    const getTokenAndEmailFromURL = useCallback(() => {
        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token');
        
        // Extract email from pathname - assuming the route is /reset-password/:email
        const pathParts = location.pathname.split('/');
        const email = pathParts[pathParts.length - 1];
        
        return { token, email };
    }, [location.search, location.pathname]);

    // Verify token when component loads
    useEffect(() => {
        const verifyToken = async () => {
            const { token, email } = getTokenAndEmailFromURL();
            
            if (!token || !email) {
                setMessage('Token or email not found in URL');
                setLoading(false);
                setTokenValid(false);
                return;
            }

            try {
                // Using GET with email in path and token as query parameter
                const response = await api.get(`/verifyTokenForgotPassword/${encodeURIComponent(email)}?token=${encodeURIComponent(token)}`);
                if (response.data.status === 200) {
                    setTokenValid(true);
                } else {
                    setMessage('Invalid or expired token');
                    setTokenValid(false);
                }
            } catch (error) {
                setMessage('Invalid or expired token');
                setTokenValid(false);
            } finally {
                setLoading(false);
            }
        };

        verifyToken();
    }, [getTokenAndEmailFromURL]);

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

    const validatePassword = (password) => {
        // Minimum 8 characters
        if (password.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        
        // At least 1 uppercase letter
        if (!/(?=.*[A-Z])/.test(password)) {
            return 'Password must contain at least 1 uppercase letter';
        }
        
        // At least 1 special character
        if (!/(?=.*[!@#$%^&*()_+\-=[\]{};':"|,.<>/?])/.test(password)) {
            return 'Password must contain at least 1 special character';
        }
        
        // At least 1 number
        if (!/(?=.*\d)/.test(password)) {
            return 'Password must contain at least 1 number';
        }
        
        // At least 1 lowercase letter
        if (!/(?=.*[a-z])/.test(password)) {
            return 'Password must contain at least 1 lowercase letter';
        }
        
        return '';
    };

    const validateFields = () => {
        let errors = {};
        let isValid = true;

        if (!formData.newPassword) {
            errors.newPassword = 'Field is required';
            isValid = false;
        } else {
            const passwordError = validatePassword(formData.newPassword);
            if (passwordError) {
                errors.newPassword = passwordError;
                isValid = false;
            }
        }

        if (!formData.confirmPassword) {
            errors.confirmPassword = 'Field is required';
            isValid = false;
        } else if (formData.newPassword !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
            isValid = false;
        }

        setErrors(errors);
        return isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateFields()) return;

        setLoading(true);
        try {
            const { token, email } = getTokenAndEmailFromURL();
            const response = await api.post('/resetPassword', {
                token: token,
                email: email,
                newPassword: formData.newPassword
            });

            if (response.status === 200) {
                setMessage('Password reset successfully!');
                setTimeout(() => {
                    history.push('/login');
                }, 3000);
            }
        } catch (error) {
            setMessage('Error resetting password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <Spinner color="primary" />
                <span className="ml-2">Verifying token...</span>
            </div>
        );
    }

    return (
        <div>
            <div className="col-md-6 mx-auto App">
                <Header title="Reset password" />
                <hr className="my-3" />
                
                {message && (
                    <Alert 
                        color={tokenValid ? 'success' : 'danger'} 
                        className="text-center" 
                        fade={false}
                    >
                        {message}
                    </Alert>
                )}

                {tokenValid && (
                    <Form onSubmit={handleSubmit}>
                        <FormGroup>
                            <Label for="newPassword">New password</Label>
                            <Input
                                type="password"
                                id="newPassword"
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                placeholder="Enter your new password"
                                autoFocus
                            />
                            {errors.newPassword && (
                                <Label className="text-danger small">{errors.newPassword}</Label>
                            )}
                            <div className="mt-2">
                                <small className="text-muted">
                                    Password must contain:
                                    <ul className="small">
                                        <li>Minimum 8 characters</li>
                                        <li>At least 1 uppercase letter</li>
                                        <li>At least 1 special character</li>
                                        <li>At least 1 number</li>
                                        <li>At least 1 lowercase letter</li>
                                    </ul>
                                </small>
                            </div>
                        </FormGroup>

                        <FormGroup>
                            <Label for="confirmPassword">Confirm new password</Label>
                            <Input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm your new password"
                            />
                            {errors.confirmPassword && (
                                <Label className="text-danger small">{errors.confirmPassword}</Label>
                            )}
                        </FormGroup>

                        <div className="button-container">
                            <Button 
                                color="primary" 
                                type="submit"
                                disabled={loading}
                                className="align-button"
                            >
                                {loading ? 'Resetting...' : 'Reset password'}
                            </Button>
                            
                            <Button 
                                color="secondary" 
                                className="align-button ml-2"
                                onClick={() => history.push('/')}
                            >
                                Back to sign in
                            </Button>
                        </div>
                    </Form>
                )}
            </div>
            <Footer />
        </div>
    );
}