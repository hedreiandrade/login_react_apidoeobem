import axios from 'axios';

export const api = axios.create({
    baseURL: 'http://localhost:8009/public/v1',
    headers: {
        'Content-Type': 'application/json'
    }
});