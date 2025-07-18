// src/pages/Login.jsx
import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import '../styles/Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    console.log('Email:', email);
    console.log('Password:', password);
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="image-wrapper">
          <img 
            src="/left-image.png" 
            alt="Tailoring Illustration" 
            className="login-image"
          />
        </div>
      </div>
      
      <div className="login-right">
        <div className="login-form">
          <h1>Welcome Back!</h1>
          <p className="subtitle">Sign in to continue to your account</p>
          
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <div className="password-label-container">
                <label htmlFor="password">Password</label>
              </div>
              <div className="password-input-container">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEye /> : < FaEyeSlash />}
                </button>
              </div>
            </div>
        
            
            <button type="submit" className="login-button">Login</button>
          </form>
          
        </div>
      </div>
    </div>
  );
};

export default Login;