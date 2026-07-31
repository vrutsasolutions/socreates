import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';

import App from './App';
import './index.css';
import './styles/design-tokens.css';
import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent'

// Remaining import statements

const options = {
  "info": {
    "applicationID": 1589259663,
    "beacon": "bam.nr-data.net",
    "errorBeacon": "bam.nr-data.net",
    "licenseKey": "NRJS-baf02f7dac3b069c3a0",
    "sa": 1
  },
  "init": {
    "ajax": {
      "deny_list": [
        "bam.nr-data.net"
      ]
    },
    "browser_consent_mode": {
      "enabled": false
    },
    "distributed_tracing": {
      "enabled": true
    },
    "performance": {
      "capture_detail": false,
      "capture_marks": false,
      "capture_measures": true
    },
    "privacy": {
      "cookies_enabled": true
    }
  },
  "loader_config": {
    "accountID": 8345048,
    "agentID": 1589259663,
    "applicationID": 1589259663,
    "licenseKey": "NRJS-baf02f7dac3b069c3a0",
    "trustKey": 8345048
  }
}

// The agent loader code executes immediately on instantiation.
const nrba = new BrowserAgent(options)



ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider
      clientId="783151813830-8dhn46v1dtefsna6r3r1gjqrfarflfjg.apps.googleusercontent.com"
    >
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);