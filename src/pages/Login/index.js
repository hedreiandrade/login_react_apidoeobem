import React, { Component } from 'react';
import { Form, FormGroup, Label, Input, Button, Alert } from 'reactstrap';
import Header from '../../components/Header';
import { api } from '../../services/api';
import '../../styles/Login.css';
import { BsFacebook, BsGoogle } from "react-icons/bs";


export default class Login extends Component {
    constructor(props) {
        super(props);
        this.state = {
            message: this.props.location.state ? this.props.location.state.message : '',
            isRegistering: false,
            errors: {},
            tabCount: 0,
            formData: {
                name: '',
                email: '',
                password: '',
                passwordConfirm: '',
                photo: null,
                photoPreview: null
            },
            processingGoogleLogin: false // NOVO ESTADO PARA CONTROLAR
        };
    }

    componentDidMount() {
        this.checkForGoogleToken();
    }

    checkForGoogleToken = () => {
        const hash = window.location.hash;
        console.log('URL atual:', window.location.href);
        
        if (hash && hash.includes('access_token')) {
            console.log('Token do Google encontrado! Processando...');
            this.setState({ processingGoogleLogin: true });
            this.processGoogleTokenFromRedirect();
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

                console.log('Resposta do backend:', response);

                if (response.data.response && response.data.response.token) {
                    const userData = response.data.response;
                    const token = typeof userData.token === 'object' ? JSON.stringify(userData.token) : String(userData.token);
                    localStorage.setItem('login_token', token);
                    localStorage.setItem('user_id', userData.user_id);
                    localStorage.setItem('photo', userData.photo || '');
                    localStorage.setItem('name', userData.name);
                    localStorage.setItem('auth_provider', userData.auth_provider);
                    // Limpar a URL
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
            console.error('Error:', error);
            this.setState({ 
                message: error.response?.data?.response || 'Erro no servidor',
                processingGoogleLogin: false 
            });
            window.history.replaceState({}, document.title, "/");
        }
    };

    handleGoogleLogin = () => {
        console.log('Iniciando login com Google...');
        // Use as variáveis de ambiente
        const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
        const redirectUri = process.env.REACT_APP_GOOGLE_REDIRECT_URI;
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${clientId}` +
            `&redirect_uri=${redirectUri}` +
            `&response_type=token` +
            `&scope=email%20profile` +
            `&prompt=select_account`;
        
        console.log('Redirecionando para Google OAuth...');
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
    };

    createAccount = async () => {
        if (!this.validateFields()) return;

        const formData = new FormData();
        formData.append('name', this.state.formData.name);
        formData.append('email', this.state.formData.email);
        formData.append('password', this.state.formData.password);
        formData.append('photo', this.state.formData.photo);

        const response = await api.post("/user", formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.status === 201) {
            this.setState({ message: 'This email needs a check confirmation in your email' });
        } else {
            if(response.data.password){
                this.setState({ message: response.data.password[0] });
            }else{
                this.setState({ message: response.data.response});
            }
        }
    };

    toggleForm = () => {
        this.setState({ 
            isRegistering: !this.state.isRegistering, 
            message: "", 
            errors: {} 
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

    handleFacebookLogin = () => {
        console.log('Login com Facebook');
    };

    render() {
        const { processingGoogleLogin } = this.state;

        return (
            <div className="col-md-6 App">
                <Header title={this.state.isRegistering ? "Register" : "H Media"} />
                <hr className="my-3" />
                
                {/* Mensagem de processamento do Google */}
                {this.state.message && (
                    <Alert 
                        color={this.state.message.includes('Processando') ? 'info' : 'danger'} 
                        className="text-center" 
                        fade={false}
                    >
                        {this.state.message}
                    </Alert>
                )}

                {/* MOSTRAR LOADING APENAS QUANDO ESTÁ PROCESSANDO GOOGLE LOGIN */}
                {processingGoogleLogin ? (
                    <div className="text-center">
                        <div className="spinner-border text-primary" role="status">
                            <span className="sr-only">Processando login...</span>
                        </div>
                        <p>Processando login com Google...</p>
                    </div>
                ) : (
                    /* SEMPRE MOSTRAR FORMULÁRIO QUANDO NÃO ESTÁ PROCESSANDO */
                    <>
                        <Form>
                            {this.state.isRegistering && (
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
                                    autoFocus={!this.state.isRegistering}
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
                            {this.state.isRegistering && (
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
                                    onClick={this.state.isRegistering ? this.createAccount : this.signIn} 
                                    onKeyPress={this.enterFormSignIn}
                                >
                                    {this.state.isRegistering ? "Register" : "Sign in"}
                                </Button>
                                <Button 
                                    color="secondary" 
                                    className="align-button" 
                                    onClick={this.toggleForm} 
                                    onKeyPress={this.enterFormRegister}
                                >
                                    {this.state.isRegistering ? "Back to sign in" : "Register account"}
                                </Button>
                            </div>
                        </Form>

                        {/* Login Social */}
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
            </div>
        );
    }
}