# eDiscovery Application

A web-based document discovery and analysis platform powered by Firebase and AI.

## Features

- User authentication (Email/Password)
- Document upload and storage
- AI-powered document querying
- Secure cloud storage
- Real-time database synchronization

## Quick Start

### Prerequisites

- Node.js (v18 or later)
- Firebase project
- Firebase CLI installed globally: `npm install -g firebase-tools`

### Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd ediscover
```

2. Install dependencies:
```bash
cd functions
npm install
```

3. Configure Firebase:
   - Copy `public/js/firebase-config.template.js` to `public/js/firebase-config.js`
   - Add your Firebase project credentials to the new file

4. **IMPORTANT:** Enable Email/Password authentication in Firebase Console
   - See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed instructions
   - This step is **required** or you'll get authentication errors

### Development

Run locally:
```bash
firebase serve
```

### Deployment

Deploy to Firebase Hosting:
```bash
firebase deploy
```

Deploy only functions:
```bash
firebase deploy --only functions
```

Deploy only hosting:
```bash
firebase deploy --only hosting
```

## Authentication Setup

**If you see the error: "Firebase: Error (auth/operation-not-allowed)"**

This means Email/Password authentication is not enabled in your Firebase Console.

👉 **[Follow the setup guide](FIREBASE_SETUP.md)** for step-by-step instructions.

## Project Structure

```
ediscover/
├── functions/              # Firebase Cloud Functions
│   ├── src/               # TypeScript source files
│   └── package.json       # Function dependencies
├── public/                # Frontend files
│   ├── index.html         # Main application
│   ├── js/
│   │   ├── firebase-config.js          # Your Firebase config (DO NOT COMMIT)
│   │   └── firebase-config.template.js # Template for configuration
│   └── styles.css         # Application styles
├── firebase.json          # Firebase configuration
└── README.md             # This file
```

## Technologies Used

- **Frontend:**
  - HTML5, CSS3, JavaScript (ES6+)
  - Firebase SDK (Auth, Firestore, Storage, Functions)

- **Backend:**
  - Firebase Cloud Functions
  - Node.js
  - TypeScript
  - Google Generative AI API

## Security

- All user data is isolated by user ID
- Firebase Security Rules should be configured for production
- Authentication required for all document operations
- Cloud Functions validate user authentication

## Troubleshooting

### Authentication Errors

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed troubleshooting.

### Cloud Functions Not Working

1. Ensure billing is enabled on your Firebase project
2. Check that the Google Generative AI API key is configured
3. Review Cloud Function logs in Firebase Console

### Document Upload Fails

1. Check Storage Rules in Firebase Console
2. Verify file size is within limits
3. Check browser console for detailed errors

## Support

- Check browser console (F12) for detailed error messages
- Review Firebase Console for quota and billing status
- See [Firebase Documentation](https://firebase.google.com/docs)

## License

[Add your license here]

## Contributors

[Add contributors here]
