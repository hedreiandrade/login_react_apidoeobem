import React, { useState, useEffect } from 'react';
import { Form, FormGroup, Label, Input, Button, Alert } from 'reactstrap';
import Header from '../../components/Header';
import { api } from '../../services/api';
import '../../styles/EditProfile.css';
import { useExpireToken } from "../../hooks/expireToken";
import SocialHeader from '../../components/SocialHeader';
import { useHistory } from 'react-router-dom';
import { getInitialsImage } from "../../ultils/initialsImage";
import { getVerifyToken } from "../../ultils/verifyToken";

// Import do DatePicker do rsuite - Versão 5.68.1 compatível com Node 14
import { DatePicker } from 'rsuite';
// Import do CSS do rsuite
import 'rsuite/dist/rsuite.min.css';

// Import do pacote country-state-city (funciona no navegador)
import { 
    Country,
    State,
    City
} from 'country-state-city';

export default function EditProfile() {
    const history = useHistory();
    if(localStorage.getItem('login_token') === null || localStorage.getItem('login_token') === ''){
        history.push("/");
    }

    useExpireToken();

    const redirectToChangePassword = () => {
        history.push('/change-password');
    };

    const name = localStorage.getItem('name') || 'User';
    const rawPhoto = localStorage.getItem('photo');

    const isValidPhoto = (photo) => {
        return photo && photo.trim() !== '' && photo !== 'null' && photo !== 'undefined';
    };

    const user = {
        photo: isValidPhoto(rawPhoto) ? rawPhoto : getInitialsImage(name)
    };

    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        name: '',
        photo: null,
        photoPreview: null,
        email: '',
        auth_provider: null,
        // CAMPOS DE ENDEREÇO
        address: '',
        number: '',
        country: '',
        countryCode: '',
        state: '',
        stateCode: '',
        city: '',
        postal_code: '',
        // NOVO: campo para data de nascimento
        birth_date: null,
        bio: '',
        website: ''
    });

    // Dados dos selects
    const [countries, setCountries] = useState([]);
    const [estadosFiltrados, setEstadosFiltrados] = useState([]);
    const [cidadesFiltradas, setCidadesFiltradas] = useState([]);

    // Carrega a lista de países quando o componente monta
    useEffect(() => {
        try {
            const countriesList = Country.getAllCountries();
            const sortedCountries = countriesList.sort((a, b) => a.name.localeCompare(b.name));
            setCountries(sortedCountries);
        } catch (error) {
            console.error('Erro ao carregar países:', error);
            setMessage('Erro ao carregar lista de países');
        }
    }, []);

    // Função para carregar estados (definida fora do useEffect para ser reutilizável)
    const loadStates = (countryCode) => {
        try {
            if (!countryCode) {
                setEstadosFiltrados([]);
                return;
            }

            const states = State.getStatesOfCountry(countryCode);
            const sortedStates = states.sort((a, b) => a.name.localeCompare(b.name));
            setEstadosFiltrados(sortedStates);
        } catch (error) {
            console.error('Erro ao carregar estados:', error);
            setMessage('Erro ao carregar lista de estados');
        }
    };

    // Função para carregar cidades (definida fora do useEffect para ser reutilizável)
    const loadCities = (countryCode, stateCode) => {
        try {
            if (!countryCode || !stateCode) {
                setCidadesFiltradas([]);
                return;
            }

            const cities = City.getCitiesOfState(countryCode, stateCode);
            const cityNames = cities.map(city => city.name).sort((a, b) => a.localeCompare(b));
            setCidadesFiltradas(cityNames);
        } catch (error) {
            console.error('Erro ao carregar cidades:', error);
            setMessage('Erro ao carregar lista de cidades');
        }
    };

    // Efeito para controlar quando o país mudou
    useEffect(() => {
        if (formData.countryCode) {
            setEstadosFiltrados([]);
            setCidadesFiltradas([]);
            loadStates(formData.countryCode);
        }
    }, [formData.countryCode]); // ✅ Dependência correta

    // Efeito para controlar quando o estado mudou
    useEffect(() => {
        if (formData.countryCode && formData.stateCode) {
            setCidadesFiltradas([]);
            loadCities(formData.countryCode, formData.stateCode);
        }
    }, [formData.countryCode, formData.stateCode]); // ✅ Dependências corretas

    // Carrega dados do usuário
    useEffect(() => {
        let isMounted = true;
    
        async function fetchUserData() {
            try {
                const token = localStorage.getItem('login_token');
                const userId = localStorage.getItem('user_id');
                if (!token || !userId) {
                    if (isMounted) setMessage('Token or user ID not found');
                    return;
                }
                const response = await api.get(`/user/${userId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const { name, photo, email, auth_provider, address, number, country, state, city, postal_code, birth_date, country_code, state_code, bio, website } = response.data;
    
                if (isMounted) {
                    setFormData({
                        name,
                        photo: null,
                        photoPreview: isValidPhoto(photo) ? photo : getInitialsImage(name),
                        email,
                        auth_provider,
                        address: address || '',
                        number: number || '',
                        country: country || '',
                        countryCode: country_code || '',
                        state: state || '',
                        stateCode: state_code || '',
                        city: city || '',
                        postal_code: postal_code || '',
                        birth_date: birth_date ? new Date(birth_date) : null,
                        bio: bio || '',
                        website: website || ''
                    });
                }
            } catch (error) {
                if (isMounted) setMessage('Error fetching user data');
            }
        }
    
        fetchUserData();
    
        return () => {
            isMounted = false;
        };
    }, []); // ✅ Sem dependências externas, executa apenas na montagem

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Atualiza o formData (sem callback)
        setFormData(prevState => {
            const newFormData = {
                ...prevState,
                [name]: value
            };
            
            // Lógica para atualizar estados baseado no país selecionado
            if (name === 'country') {
                const selectedCountry = countries.find(c => c.name === value);
                const countryCode = selectedCountry?.isoCode || '';
                
                return {
                    ...newFormData,
                    countryCode: countryCode,
                    state: '',
                    stateCode: '',
                    city: ''
                };
            }
            
            // Lógica para atualizar cidades baseado no estado selecionado
            if (name === 'state') {
                const selectedState = estadosFiltrados.find(s => s.name === value);
                const stateCode = selectedState?.isoCode || '';
                
                return {
                    ...newFormData,
                    stateCode: stateCode,
                    city: ''
                };
            }
            
            return newFormData;
        });
        
        // Limpa o erro do campo (isso é síncrono, não precisa de callback)
        setErrors(prevErrors => ({
            ...prevErrors,
            [name]: ''
        }));
    };

    const handleDateChange = (date) => {
        setFormData(prevState => ({
            ...prevState,
            birth_date: date
        }));
        setErrors(prevErrors => ({
            ...prevErrors,
            birth_date: ''
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prevState => ({
                    ...prevState,
                    photo: file,
                    photoPreview: reader.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const validateFields = () => {
        let errors = {};
        let isValid = true;

        if (!formData.name) {
            errors.name = 'Field is required';
            isValid = false;
        }

        if (!formData.email) {
            errors.email = 'Field is required';
            isValid = false;
        }

        // Validação dos campos de endereço
        if (!formData.address) {
            errors.address = 'Field is required';
            isValid = false;
        }

        if (!formData.number) {
            errors.number = 'Field is required';
            isValid = false;
        }

        if (!formData.country) {
            errors.country = 'Field is required';
            isValid = false;
        }

        if (!formData.state) {
            errors.state = 'Field is required';
            isValid = false;
        }

        // Pode haver estado sem cidades.
            /*if (!formData.city) {
            errors.city = 'Field is required';
            isValid = false;
        }*/

        if (!formData.postal_code) {
            errors.postal_code = 'Field is required';
            isValid = false;
        }

        // NOVO: Validação da data de nascimento
        if (!formData.birth_date) {
            errors.birth_date = 'Field is required';
            isValid = false;
        }

        if (formData.website) {
            const urlPattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;
            if (!urlPattern.test(formData.website)) {
                errors.website = 'Please enter a valid URL';
                isValid = false;
            }
        }

        setErrors(errors);
        return isValid;
    };

    const updateProfile = async () => {
        if (!validateFields()) return;
        const token = localStorage.getItem('login_token');
        const userId = localStorage.getItem('user_id');
        const data = new FormData();
        data.append('name', formData.name);
        data.append('email', formData.email);
        // Adiciona os campos de endereço
        data.append('address', formData.address);
        data.append('number', formData.number);
        data.append('country', formData.country);
        data.append('state', formData.state);
        data.append('city', formData.city);
        data.append('postal_code', formData.postal_code);
        // Adiciona os códigos ISO para referência futura
        data.append('country_code', formData.countryCode);
        data.append('state_code', formData.stateCode);
        
        // NOVO: Adiciona a data de nascimento no formato ISO (YYYY-MM-DD)
        if (formData.birth_date) {
            // Verifica se birth_date é um objeto Date válido
            let birthDateFormatted;
            if (formData.birth_date instanceof Date && !isNaN(formData.birth_date)) {
                birthDateFormatted = formData.birth_date.toISOString().split('T')[0];
            } else {
                // Se for string, tenta converter
                const date = new Date(formData.birth_date);
                birthDateFormatted = !isNaN(date) ? date.toISOString().split('T')[0] : formData.birth_date;
            }
            data.append('birth_date', birthDateFormatted);
        }
        
        data.append('bio', formData.bio || '');
        data.append('website', formData.website || '');
        
        if (formData.photo) {
            data.append('photo', formData.photo);
        }
        
        try {
            const isValid = await getVerifyToken(token);
            if (!isValid) {
                window.location.href = "/";
                return;
            }
            const response = await api.post(`/user/${userId}`, data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            if (response.data.status === 203) {
                setMessage('There is an account for this e-mail, try to recover your password.');
            } else {
                if(response.data.status === 401){
                     setMessage(response.data.response);
                }else{
                    localStorage.setItem('photo', response.data.photo);
                    localStorage.setItem('name', formData.name);
                    window.location.reload();
                }
            }
        } catch (error) {
            setMessage(error.response?.data?.response);
        }
    };

    return (
        <div>
            <SocialHeader user={user} />
            <div className="col-md-6 App">
                <Header title="Edit profile" />
                <hr className="my-3" />
                {message && <Alert color="danger" className="text-center" fade={false}>{message}</Alert>}
                <Form>
                    <FormGroup>
                        <Label for="name">Name</Label>
                        <Input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Type your name"
                            autoFocus
                        />
                        {errors.name && <Label className="text-danger">{errors.name}</Label>}
                    </FormGroup>
                    <FormGroup>
                        <Label for="photo">Profile photo</Label>
                        <Input type="file" id="photo" name="photo" onChange={handleFileChange} />
                        {formData.photoPreview && (
                            <div className="photo-preview-container">
                                <img src={formData.photoPreview} alt="Profile Preview" className="photo-preview" />
                            </div>
                        )}
                    </FormGroup>
                    <FormGroup>
                        <Label for="email">Email</Label>
                        <Input
                            type="text"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Type your email"
                        />
                        {errors.email && <Label className="text-danger">{errors.email}</Label>}
                    </FormGroup>
                    
                    <FormGroup>
                        <Label for="bio">Bio</Label>
                        <Input
                            type="input"
                            id="bio"
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            placeholder="Tell us about yourself"
                            rows="1"
                        />
                        {errors.bio && <Label className="text-danger">{errors.bio}</Label>}
                    </FormGroup>

                    <FormGroup>
                        <Label for="website">Website</Label>
                        <Input
                            type="url"
                            id="website"
                            name="website"
                            value={formData.website}
                            onChange={handleChange}
                            placeholder="https://yourwebsite.com"
                        />
                        {errors.website && <Label className="text-danger">{errors.website}</Label>}
                    </FormGroup>
                    
                    {/* CAMPOS DE ENDEREÇO */}
                    <FormGroup>
                        <Label for="address">Address</Label>
                        <Input
                            type="text"
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="Type your address"
                        />
                        {errors.address && <Label className="text-danger">{errors.address}</Label>}
                    </FormGroup>
                    
                    <FormGroup>
                        <Label for="number">Number</Label>
                        <Input
                            type="text"
                            id="number"
                            name="number"
                            value={formData.number}
                            onChange={handleChange}
                            placeholder="Type your address number"
                        />
                        {errors.number && <Label className="text-danger">{errors.number}</Label>}
                    </FormGroup>
                    
                    <FormGroup>
                        <Label for="country">Country</Label>
                        <Input
                            type="select"
                            id="country"
                            name="country"
                            value={formData.country}
                            onChange={handleChange}
                        >
                            <option value="">Select a country</option>
                            {countries.map((country) => (
                                <option key={country.isoCode} value={country.name}>
                                    {country.name}
                                </option>
                            ))}
                        </Input>
                        {errors.country && <Label className="text-danger">{errors.country}</Label>}
                    </FormGroup>
                    
                    <FormGroup>
                        <Label for="state">State</Label>
                        <Input
                            type="select"
                            id="state"
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            disabled={!formData.country || estadosFiltrados.length === 0}
                        >
                            <option value="">Select a state</option>
                            {estadosFiltrados.map((estado) => (
                                <option key={estado.isoCode} value={estado.name}>
                                    {estado.name}
                                </option>
                            ))}
                        </Input>
                        {errors.state && <Label className="text-danger">{errors.state}</Label>}
                    </FormGroup>
                    
                    <FormGroup>
                        <Label for="city">City</Label>
                        <Input
                            type="select"
                            id="city"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            disabled={!formData.state || cidadesFiltradas.length === 0}
                        >
                            <option value="">Select a city</option>
                            {cidadesFiltradas.map((cidade, index) => (
                                <option key={index} value={cidade}>{cidade}</option>
                            ))}
                        </Input>
                        {errors.city && <Label className="text-danger">{errors.city}</Label>}
                    </FormGroup>
                    
                    <FormGroup>
                        <Label for="postal_code">Zip Code</Label>
                        <Input
                            type="text"
                            id="postal_code"
                            name="postal_code"
                            value={formData.postal_code}
                            onChange={handleChange}
                            placeholder="Type your zip code"
                        />
                        {errors.postal_code && <Label className="text-danger">{errors.postal_code}</Label>}
                    </FormGroup>

                    {/* NOVO: Campo de Data de Nascimento com DatePicker do rsuite - Versão 5.68.1 */}
                    <FormGroup>
                        <Label for="birth_date">Birthday Date</Label>
                        <div style={{ width: '100%' }}>
                            <DatePicker
                                id="birth_date"
                                name="birth_date"
                                value={formData.birth_date}
                                onChange={handleDateChange}
                                placeholder="Select your birth date"
                                format="dd/MM/yyyy"
                                placement="bottomStart"
                                style={{ width: '100%' }}
                                shouldDisableDate={date => date > new Date() || date < new Date('1900-01-01')}
                            />
                        </div>
                        {errors.birth_date && <Label className="text-danger">{errors.birth_date}</Label>}
                    </FormGroup>

                    <div className="button-container">
                        <Button color="primary" className="align-button" onClick={updateProfile} style={{ marginRight: "10px" }}>
                            Update profile
                        </Button>
                        {formData.auth_provider === 'local' && (
                            <Button color="secondary" className="align-button" onClick={redirectToChangePassword}>
                                Change password
                            </Button>
                        )}
                    </div>
                    <br />
                    <br />
                    <br />
                </Form>
            </div>
        </div>
    );
}