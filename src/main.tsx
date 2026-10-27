import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import App from './App';
import './styles.css';
import './refinement.css';
import './conversion.css';
import './photography.css';
import './spatial.css';
import './system.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 300, damping: 30 }}><App /></MotionConfig></React.StrictMode>,
);
