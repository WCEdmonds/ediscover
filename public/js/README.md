# Firebase Configuration

## Setup Instructions

### First Time Setup

1. Copy the template file to create your configuration:
   ```bash
   cp firebase-config.template.js firebase-config.js
   ```

2. Edit `firebase-config.js` and replace the placeholder values with your actual Firebase project configuration.

3. Get your Firebase configuration from:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Click on the web app or create a new one
   - Copy the configuration object

### Security Notes

- `firebase-config.js` is gitignored to prevent accidental commits of API keys
- `firebase-config.template.js` is the template with placeholder values (safe to commit)
- Firebase client API keys are meant to be used in frontend code
- Real security is enforced through Firebase Security Rules, not by hiding the API key
- Make sure your Firestore Security Rules and Storage Rules are properly configured

### Important

The API key in `firebase-config.js` is a **client-side Firebase API key**, which is different from server-side API keys. Firebase client keys:
- Are meant to be used in frontend applications
- Are not secret (they appear in network requests)
- Are protected by Firebase Security Rules
- Should still be kept out of public repositories as a best practice

For more information, see: https://firebase.google.com/docs/projects/api-keys
