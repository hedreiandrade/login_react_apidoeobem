import React, { Component } from 'react';
import { Form, FormGroup, Label, Input, Button, Alert } from 'reactstrap';
import Header from '../../components/Header';
import {api} from '../../services/api';

export default class Login extends Component {

    constructor(props){
        super(props)
        this.state = {
            message: this.props.location.state ? this.props.location.state.message : '',
        };
    }

    signIn = async () => {
        const data = { email: this.email, password: this.password };
        try{
            const response = await api.post('login', data);
            if(typeof response.data.response.token === "undefined"){
                this.setState({ message: response.data.response});
            }else{
                localStorage.setItem('login_token', response.data.response.token);
                this.setState({ message: ''});
                this.props.history.push("/admin");
                return;
            }
        }catch(err){
            this.setState({ message: err});
            return;
        };
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
