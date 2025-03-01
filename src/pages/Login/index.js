import React, { Component } from 'react';
import { Form, FormGroup, Label, Input, Button, Alert } from 'reactstrap';
import Header from '../../components/Header';
import { api } from '../../services/api';

export default class Login extends Component {
    constructor(props) {
        super(props);
        this.state = {
            message: this.props.location.state ? this.props.location.state.message : '',
            isRegistering: false,
            errors: {},
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
            localStorage.setItem('photo', response.data.response.photo);
            this.setState({ message: '' });
            this.props.history.push("/admin");
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
                localStorage.setItem('login_token', responseLogin.data.response.token);
                this.setState({ message: '' });
                this.props.history.push("/admin");
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

    render() {
        return (
            <div className="col-md-6 App">
                <Header title={this.state.isRegistering ? "Register" : "ReactJS Login"} />
                <hr className="my-3" />
                {this.state.message && <Alert color="danger" className="text-center">{this.state.message}</Alert>}

                <Form>
                    {this.state.isRegistering && (
                        <>
                            <FormGroup>
                                <Label for="name">Name</Label>
                                <Input type="text" id="name" name="name" value={this.state.formData.name} onChange={this.handleChange} placeholder="Type your name" />
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
                        <Input type="email" id="email" name="email" value={this.state.formData.email} onChange={this.handleChange} placeholder="Type your e-mail" />
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
                        <Button color="primary" className="align-button" onClick={this.state.isRegistering ? this.createAccount : this.signIn}>
                            {this.state.isRegistering ? "Register" : "Sign In"}
                        </Button>
                        <Button color="secondary" className="align-button" onClick={this.toggleForm}>
                            {this.state.isRegistering ? "Back to Login" : "Register Account"}
                        </Button>
                    </div>
                </Form>
            </div>
        );
    }
}