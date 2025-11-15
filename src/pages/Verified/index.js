import React, { useState } from 'react';
import Footer from '../../components/Footer';
import SocialHeader from '../../components/SocialHeader';
import { Alert, Button } from 'reactstrap';
import { RiVerifiedBadgeFill } from "react-icons/ri";
import '../../styles/Verified.css';

export default function VerifiedPage() {
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [copiedPix, setCopiedPix] = useState(false);
    
    const emailText = `I would like to verify my account on H Media. Here is the payment proof.`;
    
    const pixInfo = `28.287.739/0001-45`;

    const copyToClipboard = (text, type) => {
        navigator.clipboard.writeText(text).then(() => {
            if (type === 'email') {
                setCopiedEmail(true);
                setTimeout(() => setCopiedEmail(false), 3000);
            } else {
                setCopiedPix(true);
                setTimeout(() => setCopiedPix(false), 3000);
            }
        });
    };

    const user = {
        photo: localStorage.getItem('photo') || '',
        name: localStorage.getItem('name') || 'User'
    };

    return (
        <div>
            <SocialHeader user={user} />
            <br/>
            <div className="col-md-8 App-profile" style={{ margin: '0 auto' }}>
                <div className="profile-container">
                    <div className="verified-page-content text-center">
                        <div className="verified-icon mb-4">
                            <RiVerifiedBadgeFill size={80} color="#1D9BF0" />
                        </div>
                        
                        <h1 className="verified-title mb-4">Get Verified</h1>
                        
                        <div className="verified-description mb-5">
                            <p className="lead">
                                Currently, the first 5,000 verified users on H Media will receive the verified badge 
                                <RiVerifiedBadgeFill color="#1D9BF0" style={{ margin: '0 4px' }} /> 
                                on their profile forever.
                            </p>
                            <p>
                                After reaching this number, the verification process and plans will be updated.
                            </p>
                        </div>

                        <div className="payment-section mb-5">
                            <h4 className="mb-4">Verification Process</h4>
                            
                            <div className="step-by-step mb-4">
                                <div className="step mb-3 p-3 border rounded">
                                    <h5 className="text-primary">Step 1: Make the payment</h5>
                                    <p className="mb-2">Copy the PIX code below and pay at your bank.</p>
                                    
                                    <div className="pix-amount mb-3 p-2 bg-warning text-dark rounded">
                                        <strong>Amount: R$ 160,00</strong>
                                    </div>
                                    
                                    <div className="pix-info p-3 mb-3" 
                                         style={{ 
                                             backgroundColor: '#f8f9fa', 
                                             border: '1px solid #dee2e6',
                                             borderRadius: '8px',
                                             whiteSpace: 'pre-line',
                                             textAlign: 'left'
                                         }}>
                                        <strong>Company:</strong> H.C. DE ANDRADE - ME<br/>
                                        <strong>CNPJ:</strong> 28.287.739/0001-45<br/>
                                    </div>
                                    
                                    <Button 
                                        color="success" 
                                        onClick={() => copyToClipboard(pixInfo, 'pix')}
                                        className="copy-btn"
                                        size="sm"
                                    >
                                        {copiedPix ? 'Copied!' : 'Copy PIX Information'}
                                    </Button>
                                </div>

                                <div className="step p-3 border rounded">
                                    <h5 className="text-primary">Step 2: Send the email</h5>
                                    <p className="mb-2">After payment, send the following email with your payment proof:</p>
                                    
                                    <div className="email-text-container p-3 mb-3" 
                                         style={{ 
                                             backgroundColor: '#f8f9fa', 
                                             border: '1px solid #dee2e6',
                                             borderRadius: '8px',
                                             whiteSpace: 'pre-line',
                                             textAlign: 'left'
                                         }}>
                                        {emailText}
                                    </div>
                                    
                                    <Button 
                                        color="primary" 
                                        onClick={() => copyToClipboard(emailText, 'email')}
                                        className="copy-btn"
                                        size="sm"
                                    >
                                        {copiedEmail ? 'Copied!' : 'Copy email Text'}
                                    </Button>
                                </div>
                            </div>

                            <div className="email-address mb-3">
                                <strong>Send to: </strong>
                                <span className="text-primary">hedreiandrade@gmail.com</span>
                            </div>
                            
                            {copiedEmail && (
                                <Alert color="success" className="mt-3" fade={false}>
                                    Email text copied to clipboard!
                                </Alert>
                            )}
                            {copiedPix && (
                                <Alert color="success" className="mt-3" fade={false}>
                                    PIX information copied to clipboard!
                                </Alert>
                            )}
                        </div>

                        <div className="verified-benefits mt-5">
                            <h4 className="mb-4">Benefits of being Verified</h4>
                            <div className="row">
                                <div className="col-md-6">
                                    <ul className="list-unstyled text-start">
                                        <li className="mb-3">
                                            <RiVerifiedBadgeFill color="#1D9BF0" className="me-2" size={20} />
                                            <strong>Blue verification badge</strong> - Stand out with the official verified symbol
                                        </li>
                                        <li className="mb-3">
                                            <RiVerifiedBadgeFill color="#1D9BF0" className="me-2" size={20} />
                                            <strong>Enhanced credibility</strong> - Build trust with your audience
                                        </li>
                                    </ul>
                                </div>
                                <div className="col-md-6">
                                    <ul className="list-unstyled text-start">
                                        <li className="mb-3">
                                            <RiVerifiedBadgeFill color="#1D9BF0" className="me-2" size={20} />
                                            <strong>Early feature access</strong> - Get first access to new platform features
                                        </li>
                                        <li className="mb-3">
                                            <RiVerifiedBadgeFill color="#1D9BF0" className="me-2" size={20} />
                                            <strong>Priority support</strong> - Receive faster responses from our support team
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="verification-note mt-5 p-3 bg-light rounded">
                            <p className="mb-0 text-muted">
                                <small>
                                    <strong>Note:</strong> Verification requests are processed within 2-3 business days after payment confirmation. 
                                    You will receive an email notification once your account has been verified.
                                </small>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}