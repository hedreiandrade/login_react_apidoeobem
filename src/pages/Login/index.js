import React, { Component } from 'react';
import { Form, FormGroup, Label, Input, Button, Alert } from 'reactstrap';
import Header from '../../components/Header';

export default class Login extends Component {

    constructor(props){
        super(props)
        this.state = {
            message: this.props.location.state ? this.props.location.state.message : '',
        };
    }

    signIn = () => {
        const data = { email: this.email, password: this.password };
        if(typeof data.email === "undefined" && typeof data.password === "undefined"){
            this.setState({ message: 'Email and Password is required'});
        }
        const requestInfo = {
            method: 'POST',
            body: JSON.stringify(data),
            headers: new Headers({
                'Content-Type': 'application/json'
            })
        };

        fetch('http://localhost:8009/public/v1/login', requestInfo)
        .then(response => {
            if(response.ok){
                return response.json();
            }

            throw new Error("Login Inválido...");
        })
        .then(response => {
            if(typeof response.response.token === "undefined"){
                this.setState({ message: response.response});
            }else{
                localStorage.setItem('login_token', response.response.token);
                this.setState({ message: ''});
                this.props.history.push("/admin");
                return;
            }
        })
        .catch(e => {
            this.setState({ message: e.message});
        });

    }

    render(){
        return (
            <div className="col-md-6">
                <Header title="ReactJS Login" />
                <hr className="my-3" />
                {
                    this.state.message !== ''?(
                        <Alert color="danger" className="text-center"> {this.state.message}</Alert>
                    ) : ''
                }
                <Form>
                    <FormGroup>
                        <Label for="email">Email</Label>
                        <Input type="text" id="email" name="email" onChange={e => this.email = e.target.value} placeholder="Type your e-mail" />
                    </FormGroup>
                    <FormGroup>
                        <Label for="password">Password</Label>
                        <Input type="password" id="password" name="password" onChange={e => this.password = e.target.value} placeholder="Type your password" />
                    </FormGroup>
                    <Button color="primary" block onClick={this.signIn}> Sign In </Button>
                </Form>
            </div>
        );
    }
}
