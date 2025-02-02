import React, { Component } from 'react';
import { Form, FormGroup, Label, Input, Button, Alert } from 'reactstrap';
import Header from '../../components/Header';
import { api } from '../../services/api';

export default class Login extends Component {

    constructor(props) {
        super(props)
        this.state = {
            message: this.props.location.state ? this.props.location.state.message : '',
            isRegistering: false,
        };
    }

    signIn = async () => {
        const data = { email: this.email, password: this.password };
        const response = await api.post('/login', data);
        if (typeof response.data.response.token === "undefined") {
            this.setState({ message: response.data.response });
        } else {
            localStorage.setItem('login_token', response.data.response.token);
            this.setState({ message: '' });
            this.props.history.push("/admin");
            return;
        }
    }

    createAccount = async () => {
        const data = { name: this.name, email: this.email, password: this.password };
        const response = await api.post("/user", data);
        if (response.status === 201) {
            const dataLogin = { email: this.email, password: this.password };
            const responseLogin = await api.post('/login', dataLogin);
            if (typeof responseLogin.data.response.token === "undefined") {
                this.setState({ message: 'Erro ao gerar token após registrar.' });
            }else{
                localStorage.setItem('login_token', responseLogin.data.response.token);
                this.setState({ message: '' });
                this.props.history.push("/admin");
                return;
            }
        } else {
            this.setState({ message: 'Erro ao registrar a conta.' });
        }
    };

    toggleForm = () => {
        this.setState({ isRegistering: !this.state.isRegistering, message: "" });
    };

    render() {
        return (
            <div className="col-md-6">
                <Header title={this.state.isRegistering ? "Register" : "ReactJS Login"} />
                <hr className="my-3" />
                {this.state.message !== "" ? <Alert color="danger" className="text-center">{this.state.message}</Alert> : ""}

                {this.state.isRegistering ? (
                    <Form>
                        <FormGroup>
                            <Label for="name">Name</Label>
                            <Input type="text" id="name" name="name" onChange={(e) => (this.name = e.target.value)} placeholder="Type your name" />
                        </FormGroup>
                        <FormGroup>
                            <Label for="email">Email</Label>
                            <Input type="email" id="email" name="email" onChange={(e) => (this.email = e.target.value)} placeholder="Type your e-mail" />
                        </FormGroup>
                        <FormGroup>
                            <Label for="password">Password</Label>
                            <Input type="password" id="password" name="password" onChange={(e) => (this.password = e.target.value)} placeholder="Type your password" />
                        </FormGroup>
                        <FormGroup>
                            <Label for="password">Confirme Password</Label>
                            <Input type="password" id="password_confirme" name="password" onChange={(e) => (this.password = e.target.value)} placeholder="Type your password" />
                        </FormGroup>
                        <div className="button-container">
                            <Button color="primary" className="align-button" onClick={this.createAccount}>
                                Register
                            </Button>
                            <Button color="secondary" className="align-button" onClick={this.toggleForm}>
                                Back to Login
                            </Button>
                        </div>
                    </Form>
                ) : (
                    // Formulário de Login
                    <Form>
                        <FormGroup>
                            <Label for="email">Email</Label>
                            <Input type="text" id="email" name="email" onChange={(e) => (this.email = e.target.value)} placeholder="Type your e-mail" />
                        </FormGroup>
                        <FormGroup>
                            <Label for="password">Password</Label>
                            <Input type="password" id="password" name="password" onChange={(e) => (this.password = e.target.value)} placeholder="Type your password" />
                        </FormGroup>
                        <div className="button-container">
                            <Button color="primary" className="align-button" onClick={this.signIn}>
                                Sign In
                            </Button>
                            <Button color="primary" className="align-button" onClick={this.toggleForm}>
                                Create Account
                            </Button>
                        </div>
                    </Form>
                )}
            </div>
        );
    }
}
