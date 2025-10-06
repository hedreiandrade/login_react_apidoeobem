import React, { Component } from 'react';
import { Form, FormGroup, Label, Input, Button, Alert } from 'reactstrap';
import Header from '../../components/Header';
import { api } from '../../services/api';
import '../../styles/Login.css';

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
            }
        };
    }

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
            const responseLogin = await api.post('/login', { email: this.state.formData.email, password: this.state.formData.password });
            if (typeof responseLogin.data.response.token === "undefined") {
                this.setState({ message: 'Erro ao gerar token após registrar.' });
            } else {
                localStorage.setItem('photo', responseLogin.data.response.photo);
                localStorage.setItem('name', responseLogin.data.response.name);
                localStorage.setItem('user_id', responseLogin.data.response.user_id);
                localStorage.setItem('login_token', responseLogin.data.response.token);
                this.setState({ message: '' });
                this.props.history.push("/feed");
            }
        } else {
            if(response.data.password){
                this.setState({ message: response.data.password[0] });
            }else{
                this.setState({ message: response.data.response});
            }
        }
    };

    toggleForm = () => {
        this.setState({ isRegistering: !this.state.isRegistering, message: "", errors: {} });
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

    // Funções para login social
    handleGoogleLogin = () => {
        // Implementar lógica de login com Google
        console.log('Login com Google');
        // Redirecionar para API de autenticação do Google
        // window.location.href = '/api/auth/google';
    };

    handleFacebookLogin = () => {
        // Implementar lógica de login com Facebook
        console.log('Login com Facebook');
        // Redirecionar para API de autenticação do Facebook
        // window.location.href = '/api/auth/facebook';
    };

    render() {
        return (
            <div className="col-md-6 App">
                <Header title={this.state.isRegistering ? "Register" : "H Media"} />
                <hr className="my-3" />
                {this.state.message && <Alert color="danger" className="text-center" fade={false}>{this.state.message}</Alert>}

                <Form>
                    {this.state.isRegistering && (
                        <>
                            <FormGroup>
                                <Label for="name">Name</Label>
                                <Input type="text" id="name" name="name" value={this.state.formData.name} onChange={this.handleChange} placeholder="Type your name" autoFocus/>
                                {this.state.errors.name && <Label className="text-danger">{this.state.errors.name}</Label>}
                            </FormGroup>
                            <FormGroup>
                                <Label for="photo">Profile Photo</Label>
                                <Input type="file" id="photo" name="photo" onChange={this.handleFileChange} />
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
                        <Input type="email" id="email" name="email" value={this.state.formData.email} onChange={this.handleChange} placeholder="Type your e-mail" autoFocus/>
                        {this.state.errors.email && <Label className="text-danger">{this.state.errors.email}</Label>}
                    </FormGroup>
                    <FormGroup>
                        <Label for="password">Password</Label>
                        <Input type="password" id="password" name="password" value={this.state.formData.password} onChange={this.handleChange} placeholder="Type your password" />
                        {this.state.errors.password && <Label className="text-danger">{this.state.errors.password}</Label>}
                    </FormGroup>
                    {this.state.isRegistering && (
                        <FormGroup>
                            <Label for="passwordConfirm">Confirm Password</Label>
                            <Input type="password" id="passwordConfirm" name="passwordConfirm" value={this.state.formData.passwordConfirm} onChange={this.handleChange} placeholder="Confirm your password" />
                            {this.state.errors.passwordConfirm && <Label className="text-danger">{this.state.errors.passwordConfirm}</Label>}
                        </FormGroup>
                    )}
                    <div className="button-container">
                        <Button color="primary" className="align-button" onClick={this.state.isRegistering ? this.createAccount : this.signIn} onBlur={this.enterFormSignIn}>
                            {this.state.isRegistering ? "Register" : "Sign in"}
                        </Button>
                        <Button color="secondary" className="align-button" onClick={this.toggleForm} onBlur={this.enterFormRegister}>
                            {this.state.isRegistering ? "Back to sign in" : "Register account"}
                        </Button>
                    </div>
                </Form>

                {/* Login Social - Adicionado abaixo do formulário */}
                <div className="social-login-container">
                    <Button 
                        color="outline-primary" 
                        className="social-button google-button"
                        onClick={this.handleGoogleLogin}
                        block
                    >
                        <div className="social-button-content">
                            <svg width="20" height="20" viewBox="0 0 24 24" className="social-icon">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
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
                            <svg width="20" height="20" viewBox="0 0 24 24" className="social-icon">
                                <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                            <span className="social-button-text">Continue with Facebook</span>
                        </div>
                    </Button>
                </div>
            </div>
        );
    }
}