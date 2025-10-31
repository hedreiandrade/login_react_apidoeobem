import React, { Component } from 'react';
import { Form, FormGroup, Label, Input, Button, Alert } from 'reactstrap';
import Header from '../../components/Header';
import { api } from '../../services/api';
import '../../styles/Login.css';
import { BsFacebook, BsGoogle } from "react-icons/bs";
import { FaHeading } from "react-icons/fa6";

export default class Login extends Component {
    constructor(props) {
        super(props);
        this.state = {
            message: this.props.location.state ? this.props.location.state.message : '',
            isRegistering: false,
            errors: {},
            tabCount: 0,
            showForgotPassword: false,
            formData: {
                name: '',
                email: '',
                password: '',
                passwordConfirm: '',
                photo: null,
                photoPreview: null
            },
            processingGoogleLogin: false,
            processingFacebookLogin: false
        };
    }

    componentDidMount() {
        this.checkForSocialTokens();
    }

    checkForSocialTokens = () => {
        const hash = window.location.hash;
        const urlParams = new URLSearchParams(window.location.search);
        
        if (hash && hash.includes('access_token')) {
            const hashParams = new URLSearchParams(hash.substring(1));
            const state = hashParams.get('state');
            if (state && state.includes('facebook')) {
                this.setState({ processingFacebookLogin: true });
                this.processFacebookTokenFromRedirect();
            } else {
                this.setState({ processingGoogleLogin: true });
                this.processGoogleTokenFromRedirect();
            }
        }
        else if (urlParams.has('access_token')) {
            this.setState({ processingFacebookLogin: true });
            this.processFacebookTokenFromRedirect();
        }
    };

    processGoogleTokenFromRedirect = async () => {
        try {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            
            if (accessToken) {
                this.setState({ 
                    message: 'Processando login com Google...',
                    processingGoogleLogin: true 
                });
                
                const response = await api.post('/loginGoogle', {
                    token: accessToken
                });

                if (response.data.response && response.data.response.token) {
                    const userData = response.data.response;
                    const token = typeof userData.token === 'object' ? JSON.stringify(userData.token) : String(userData.token);
                    localStorage.setItem('login_token', token);
                    localStorage.setItem('user_id', userData.user_id);
                    localStorage.setItem('photo', userData.photo || '');
                    localStorage.setItem('name', userData.name);
                    localStorage.setItem('auth_provider', userData.auth_provider);
                    window.history.replaceState({}, document.title, "/");
                    
                    this.setState({ 
                        message: '',
                        processingGoogleLogin: false 
                    });
                    this.props.history.push("/feed");
                } else {
                    this.setState({ 
                        message: response.data.response || 'Erro no login com Google',
                        processingGoogleLogin: false 
                    });
                    window.history.replaceState({}, document.title, "/");
                }
            }
        } catch (error) {
            this.setState({ 
                message: error.response?.data?.response || 'Erro no servidor',
                processingGoogleLogin: false 
            });
            window.history.replaceState({}, document.title, "/");
        }
    };

    processFacebookTokenFromRedirect = async () => {
        try {
            let accessToken;
            const hash = window.location.hash.substring(1);
            const urlParams = new URLSearchParams(window.location.search);
            
            if (hash) {
                const hashParams = new URLSearchParams(hash);
                accessToken = hashParams.get('access_token');
            } else {
                accessToken = urlParams.get('access_token');
            }
            
            if (accessToken) {
                this.setState({ 
                    message: 'Processando login com Facebook...',
                    processingFacebookLogin: true 
                });
                
                const response = await api.post('/loginFacebook', {
                    token: accessToken
                });

                let responseData;
                
                if (typeof response.data === 'string') {
                    const jsonMatch = response.data.match(/\{"response":\{[^]+\}\}/);
                    if (jsonMatch) {
                        try {
                            responseData = JSON.parse(jsonMatch[0]);
                        } catch (parseError) {
                            console.error('Erro ao parsear JSON:', parseError);
                        }
                    }
                } else {
                    responseData = response.data;
                }

                const userData = responseData?.response || responseData;

                if (userData && userData.token) {
                    const token = typeof userData.token === 'object' ? JSON.stringify(userData.token) : String(userData.token);
                    localStorage.setItem('login_token', token);
                    localStorage.setItem('user_id', userData.user_id);
                    localStorage.setItem('photo', userData.photo || '');
                    localStorage.setItem('name', userData.name);
                    localStorage.setItem('auth_provider', userData.auth_provider);
                    window.history.replaceState({}, document.title, "/");
                    
                    this.setState({ 
                        message: '',
                        processingFacebookLogin: false 
                    });
                    this.props.history.push("/feed");
                } else {
                    this.setState({ 
                        message: response.data.response || 'Erro no login com Facebook',
                        processingFacebookLogin: false 
                    });
                    window.history.replaceState({}, document.title, "/");
                }
            }
        } catch (error) {
            console.error('Error Facebook:', error);
            this.setState({ 
                message: error.response?.data?.response || 'Erro no servidor',
                processingFacebookLogin: false 
            });
            window.history.replaceState({}, document.title, "/");
        }
    };

    handleGoogleLogin = () => {
        const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
        const redirectUri = process.env.REACT_APP_GOOGLE_REDIRECT_URI;
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${clientId}` +
            `&redirect_uri=${redirectUri}` +
            `&response_type=token` +
            `&scope=email%20profile` +
            `&prompt=select_account` +
            `&state=google_${Math.random().toString(36).substring(7)}`;
        window.location.href = authUrl;
    };

    handleFacebookLogin = () => {
        const clientIdFb = process.env.REACT_APP_FACEBOOK_APP_ID;
        const redirectUriFb = process.env.REACT_APP_FACEBOOK_REDIRECT_URI;
        const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
            `client_id=${clientIdFb}` +
            `&redirect_uri=${encodeURIComponent(redirectUriFb)}` +
            `&response_type=token` +
            `&scope=email,public_profile` +
            `&auth_type=rerequest` +
            `&state=facebook_${Math.random().toString(36).substring(7)}`;
        window.location.href = authUrl;
    };

    handleChange = (e) => {
        const { name, value } = e.target;
        this.setState((prevState) => ({
            formData: {
                ...prevState.formData,
                [name]: value
            },
            errors: {
                ...prevState.errors,
                [name]: ''
            }
        }));
    };

    handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                this.setState({
                    formData: {
                        ...this.state.formData,
                        photo: file,
                        photoPreview: reader.result
                    }
                });
            };
            reader.readAsDataURL(file);
        }
    };

    validateFields = () => {
        let errors = {};
        let isValid = true;
        const { name, email, password, passwordConfirm } = this.state.formData;

        if (!email) {
            errors.email = "Field is required";
            isValid = false;
        }
        if (!password) {
            errors.password = "Field is required";
            isValid = false;
        }
        if (this.state.isRegistering) {
            if (!name) {
                errors.name = "Field is required";
                isValid = false;
            }
            if (!passwordConfirm) {
                errors.passwordConfirm = "Field is required";
                isValid = false;
            }
            if (!passwordConfirm) {
                errors.confirmNewPassword = 'Confirm new password is required';
                isValid = false;
            } else if (password !== passwordConfirm) {
                errors.passwordConfirm = 'Passwords do not match';
                isValid = false;
            }
        }

        this.setState({ errors });
        return isValid;
    };

    signIn = async () => {
        if (!this.validateFields()) return;

        const { email, password } = this.state.formData;
        
        try {
            const response = await api.post('/login', { email, password });
            if (typeof response.data.response.token === "undefined") {
                this.setState({ message: response.data.response });
            } else {
                localStorage.setItem('login_token', response.data.response.token);
                localStorage.setItem('user_id', response.data.response.user_id);
                localStorage.setItem('photo', response.data.response.photo);
                localStorage.setItem('name', response.data.response.name);
                this.setState({ message: '' });
                this.props.history.push("/feed");
            }
        } catch (error) {
            this.setState({ 
                message: error.response?.data?.response || 'Erro no servidor' 
            });
        }
    };

    createAccount = async () => {
        if (!this.validateFields()) return;
        this.setState({ message: 'Creating account and sending email confirmation.' });
        const formData = new FormData();
        formData.append('name', this.state.formData.name);
        formData.append('email', this.state.formData.email);
        formData.append('password', this.state.formData.password);
        formData.append('photo', this.state.formData.photo);

        try {
            const response = await api.post("/user", formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.status === 201) {
                // Mostra mensagem de sucesso (success/verde) após criar a conta
                this.setState({ 
                    message: 'Account created successfully! Check your email to confirm your account.' 
                });
            } else {
                if(response.data.password){
                    this.setState({ message: response.data.password[0] });
                }else{
                    this.setState({ message: response.data.response});
                }
            }
        } catch (error) {
            if(error.response?.data?.password){
                this.setState({ message: error.response.data.password[0] });
            }else{
                this.setState({ 
                    message: error.response?.data?.response || 'Error creating account' 
                });
            }
        }
    };

    toggleForm = () => {
        this.setState({ 
            isRegistering: !this.state.isRegistering, 
            message: "", 
            errors: {},
            showForgotPassword: false
        });
    };

    enterFormSignIn = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.signIn();
        }
    };
    
    enterFormRegister = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.toggleForm();
        }
    };

    handleForgotPassword = () => {
        this.setState({ 
            showForgotPassword: true,
            message: '' 
        });
    };

    handleBackToLogin = () => {
        this.setState({ 
            showForgotPassword: false,
            message: '' 
        });
    };

    handleSendResetEmail = async () => {
        const { email } = this.state.formData;
        if (!email) {
            this.setState({ 
                message: 'Please enter your email address' 
            });
            return;
        }
        try {
            this.setState({ message: 'Sending reset email...' });
            const response = await api.get(`/emailForgotPassword/${email}`);
            if (response.status === 200) {
                this.setState({ 
                    message: 'Password reset email sent! Check your inbox.' 
                });
            } else {
                this.setState({ 
                    message: response.data.response || 'Error sending reset email' 
                });
            }
        } catch (error) {
            this.setState({ 
                message: error.response?.data?.response || 'Error sending reset email' 
            });
        }
    };

    render() {
        const { processingGoogleLogin, processingFacebookLogin, showForgotPassword, isRegistering } = this.state;
        const processingAnyLogin = processingGoogleLogin || processingFacebookLogin;

        return (
            <div className="col-md-6 App">
                <Header 
                    title={
                        isRegistering ? "Register" : 
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FaHeading size={30} style={{ marginRight: '8px' }} />
                            Media
                        </div>
                    } 
                />
                <hr className="my-3" />         
                {this.state.message && (
                    <Alert 
                        color={
                            this.state.message.includes('Processando') || 
                            this.state.message.toLowerCase().includes('sending') ? 'info' :  
                            this.state.message.includes('Password reset email sent') || 
                            this.state.message.includes('Account created successfully') || 
                            this.state.message.includes('This email needs a check confirmation') ? 'success' : 
                            'danger'
                        } 
                        className="text-center" 
                        fade={false}
                    >
                        {this.state.message}
                    </Alert>
                )}
                {processingAnyLogin ? (
                    <div className="text-center">
                        <div className="spinner-border text-primary" role="status">
                        </div>
                        <p>
                            {processingGoogleLogin && 'Processando login com Google...'}
                            {processingFacebookLogin && 'Processando login com Facebook...'}
                        </p>
                    </div>
                ) : (
                    <>
                        {showForgotPassword ? (
                            <Form>
                                <FormGroup>
                                    <Label for="resetEmail">Enter your email to reset password</Label>
                                    <Input 
                                        type="email" 
                                        id="resetEmail" 
                                        name="email" 
                                        value={this.state.formData.email} 
                                        onChange={this.handleChange} 
                                        placeholder="Type your e-mail" 
                                        autoFocus
                                    />
                                </FormGroup>
                                <div className="button-container">
                                    <Button 
                                        color="primary" 
                                        className="align-button" 
                                        onClick={this.handleSendResetEmail}
                                    >
                                        Send reset email
                                    </Button>
                                    <Button 
                                        color="secondary" 
                                        className="align-button" 
                                        onClick={this.handleBackToLogin}
                                    >
                                        Back to sign in
                                    </Button>
                                </div>
                            </Form>
                        ) : (
                            <>
                                <Form>
                                    {isRegistering && (
                                        <>
                                            <FormGroup>
                                                <Label for="name">Name</Label>
                                                <Input 
                                                    type="text" 
                                                    id="name" 
                                                    name="name" 
                                                    value={this.state.formData.name} 
                                                    onChange={this.handleChange} 
                                                    placeholder="Type your name" 
                                                    autoFocus
                                                />
                                                {this.state.errors.name && <Label className="text-danger">{this.state.errors.name}</Label>}
                                            </FormGroup>
                                            <FormGroup>
                                                <Label for="photo">Profile Photo</Label>
                                                <Input 
                                                    type="file" 
                                                    id="photo" 
                                                    name="photo" 
                                                    onChange={this.handleFileChange} 
                                                />
                                                {this.state.formData.photoPreview && (
                                                    <div className="photo-preview-container">
                                                        <img src={this.state.formData.photoPreview} alt="Profile Preview" className="photo-preview" />
                                                    </div>
                                                )}
                                            </FormGroup>
                                        </>
                                    )}
                                    <FormGroup>
                                        <Label for="email">Email</Label>
                                        <Input 
                                            type="email" 
                                            id="email" 
                                            name="email" 
                                            value={this.state.formData.email} 
                                            onChange={this.handleChange} 
                                            placeholder="Type your e-mail" 
                                            autoFocus={!isRegistering}
                                        />
                                        {this.state.errors.email && <Label className="text-danger">{this.state.errors.email}</Label>}
                                    </FormGroup>
                                    <FormGroup>
                                        <Label for="password">Password</Label>
                                        <Input 
                                            type="password" 
                                            id="password" 
                                            name="password" 
                                            value={this.state.formData.password} 
                                            onChange={this.handleChange} 
                                            placeholder="Type your password" 
                                        />
                                        {this.state.errors.password && <Label className="text-danger">{this.state.errors.password}</Label>}
                                    </FormGroup>
                                    {isRegistering && (
                                        <FormGroup>
                                            <Label for="passwordConfirm">Confirm Password</Label>
                                            <Input 
                                                type="password" 
                                                id="passwordConfirm" 
                                                name="passwordConfirm" 
                                                value={this.state.formData.passwordConfirm} 
                                                onChange={this.handleChange} 
                                                placeholder="Confirm your password" 
                                            />
                                            {this.state.errors.passwordConfirm && <Label className="text-danger">{this.state.errors.passwordConfirm}</Label>}
                                        </FormGroup>
                                    )}
                                    <div className="button-container">
                                        <Button 
                                            color="primary" 
                                            className="align-button" 
                                            onClick={isRegistering ? this.createAccount : this.signIn} 
                                            onKeyPress={this.enterFormSignIn}
                                        >
                                            {isRegistering ? "Register" : "Sign in"}
                                        </Button>
                                        <Button 
                                            color="secondary" 
                                            className="align-button" 
                                            onClick={this.toggleForm} 
                                            onKeyPress={this.enterFormRegister}
                                        >
                                            {isRegistering ? "Back to sign in" : "Register account"}
                                        </Button>
                                    </div>

                                    {/* NOVO: Link Forgot Password - só mostra no login */}
                                    {!isRegistering && (
                                        <div className="forgot-password-container" style={{ marginTop: '15px', textAlign: 'center' }}>
                                            <Button 
                                                color="link" 
                                                onClick={this.handleForgotPassword}
                                                style={{ 
                                                    padding: '15px 10px', 
                                                    color: '#000000', 
                                                    fontSize: '16px',
                                                    textDecoration: 'none'
                                                }}
                                            >
                                                Forgot your password ?
                                            </Button>
                                        </div>
                                    )}
                                </Form>

                                <div className="social-login-container">
                                    <Button 
                                        color="outline-primary" 
                                        className="social-button google-button"
                                        onClick={this.handleGoogleLogin}
                                        block
                                    >
                                        <div className="social-button-content">
                                            <BsGoogle size={20} className="social-icon" />
                                            <span className="social-button-text">Continue with Google</span>
                                        </div>
                                    </Button>
                                    
                                    <Button 
                                        color="outline-primary" 
                                        className="social-button facebook-button"
                                        onClick={this.handleFacebookLogin}
                                        block
                                    >
                                        <div className="social-button-content">
                                            <BsFacebook size={20} className="social-icon" />
                                            <span className="social-button-text">Continue with Facebook</span>
                                        </div>
                                    </Button>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        );
    }
}