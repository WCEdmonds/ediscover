# Firebase Authentication Setup Guide

This guide will help you enable Email/Password authentication for the eDiscovery application.

## Error: "Firebase: Error (auth/operation-not-allowed)"

This error occurs when Email/Password authentication is **not enabled** in your Firebase Console. Follow the steps below to fix it.

---

## Step-by-Step Instructions

### 1. Access Firebase Console

1. Open your web browser and go to: **https://console.firebase.google.com/**
2. Sign in with your Google account (the one associated with this Firebase project)

### 2. Select Your Project

1. You should see a list of your Firebase projects
2. Click on the **"ediscover"** project card

### 3. Navigate to Authentication

1. In the left sidebar menu, click on **"Build"** (if collapsed)
2. Click on **"Authentication"**
3. If this is your first time, you may see a "Get Started" button - click it

### 4. Enable Email/Password Provider

1. Click on the **"Sign-in method"** tab at the top
2. You'll see a list of authentication providers
3. Find **"Email/Password"** in the list
4. Click on it to expand the configuration
5. Toggle the **"Enable"** switch to ON
6. Click **"Save"**

### 5. Verify the Setup

1. The Email/Password provider should now show as "Enabled" in green
2. You can now close the Firebase Console

### 6. Test Authentication

1. Go back to your eDiscovery application
2. Try creating a new account with:
   - A valid email address
   - A password (at least 6 characters)
   - Confirm your password
3. Click "Create Account"
4. If successful, you should be logged in automatically!

---

## Alternative Authentication Methods (Optional)

If you want to enable other sign-in methods, you can configure them in the same "Sign-in method" tab:

- **Google** - Sign in with Google accounts
- **Facebook** - Sign in with Facebook accounts
- **GitHub** - Sign in with GitHub accounts
- **Anonymous** - Allow users to sign in anonymously

Each provider has its own setup requirements and documentation.

---

## Troubleshooting

### Issue: Still getting errors after enabling Email/Password

**Solution:**
- Clear your browser cache
- Hard reload the page (Ctrl+Shift+R or Cmd+Shift+R)
- Make sure you saved the changes in Firebase Console

### Issue: "Email already in use"

**Solution:**
- This email is already registered
- Try logging in instead of signing up
- Or use a different email address

### Issue: "Password is too weak"

**Solution:**
- Use a password with at least 6 characters
- Consider using a mix of letters, numbers, and special characters

### Issue: "Invalid email address"

**Solution:**
- Make sure your email is in the correct format: `user@example.com`
- Check for typos or extra spaces

---

## Firebase Project Configuration

Your current Firebase configuration:

- **Project ID:** ediscover
- **Auth Domain:** ediscover.firebaseapp.com
- **API Key:** Configured in `public/js/firebase-config.js`

### Security Note

The file `public/js/firebase-config.js` contains your Firebase API key. While this key is safe to include in client-side code (it's expected by Firebase), you should:

1. Keep your Firebase Security Rules properly configured
2. Never commit sensitive data to your repository
3. Enable App Check for additional security (optional)

---

## Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)

---

## Need More Help?

If you continue to experience issues:

1. Check the browser console for detailed error messages (F12 → Console tab)
2. Verify your Firebase project has billing enabled (if using Cloud Functions)
3. Check Firebase status page: https://status.firebase.google.com/
4. Review the Firebase Authentication quota limits

---

**Last Updated:** 2025-11-11
