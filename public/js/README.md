# Firebase Configuration

## About Firebase API Keys

The `firebase-config.js` file contains your Firebase project configuration, including the client API key.

### Important: Firebase Client API Keys Are Public

**Firebase client API keys are NOT secret** and are designed to be included in your frontend code. They are fundamentally different from server-side API keys:

- ✅ Safe to commit to public repositories
- ✅ Safe to include in frontend bundles
- ✅ Visible in network requests (by design)
- ✅ Protected by Firebase Security Rules (the real security layer)

### Security Notes

Real security for Firebase applications comes from:
1. **Firestore Security Rules** - Control database access
2. **Storage Security Rules** - Control file access
3. **Firebase Authentication** - Verify user identity
4. **API restrictions** (optional) - Restrict which domains can use the API key

The client API key simply identifies which Firebase project to connect to.

### Configuration Files

- `firebase-config.js` - Your actual Firebase configuration (included in deployments)
- `firebase-config.template.js` - Template for creating new configurations

### Learn More

- [Firebase API Key Security](https://firebase.google.com/docs/projects/api-keys)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
