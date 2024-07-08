function useToken() {
    const token = localStorage.getItem('login_token');
    return token;
}

export default useToken;