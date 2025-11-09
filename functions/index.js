import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleAuth } from 'google-auth-library';

// We will use the Generative Language REST API directly instead of Genkit to
// avoid plugin initialization errors (e.g. reading 'pluginId' of undefined).
// This keeps the Cloud Function simpler and more robust.

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();
const storage = getStorage();

// Create callable function for AI queries
// Export a callable named `docQuery` so client-side `httpsCallable(functions, 'docQuery')`
// matches the deployed function name used by the frontend.
export const docQuery = onCall({ 
  maxInstances: 10,
  memory: '1GiB',
  timeoutSeconds: 120,
  secrets: ['GOOGLE_GENAI_API_KEY']
}, async (request) => {
  console.info('docQuery invoked. Project env:', {
    GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
    GCP_PROJECT: process.env.GCP_PROJECT,
    PROJECT_ID: process.env.PROJECT_ID,
    REGION: process.env.FUNCTION_REGION || process.env.FUNCTIONS_REGION,
    hasApiKeyEnv: !!process.env.GOOGLE_GENAI_API_KEY
  });
  // Accept userId either from the request data (explicit) or from the authenticated
  // caller (request.auth.uid). This makes the callable more robust and easier to
  // call from the frontend (which may not send userId explicitly).
  const { query, userId: providedUserId } = (request.data || {});
  const userId = providedUserId || (request.auth && request.auth.uid) || null;

  if (!query || !userId) {
    throw new HttpsError('invalid-argument', 'Query and userId are required');
  }

  try {
    // Find relevant documents first
    const relevantDocs = await findRelevantDocsByMetadata(query, userId);
    
    if (relevantDocs.length === 0) {
      return { answer: "No relevant documents found for your query.", sources: [] };
    }

    // Fetch text content for relevant docs
    const docsWithText = await Promise.all(
      relevantDocs.map(async doc => ({
        ...doc,
        text: await fetchDocumentText(doc, userId)
      }))
    );

    // Build a single text context by concatenating the selected documents.
    const context = docsWithText
      .map(doc => `Document ${doc.id}:\n${doc.text}\n`)
      .join('\n\n');

    const apiKey = process.env.GOOGLE_GENAI_API_KEY || null;
    const prompt = `Based on the following documents, ${query}\n\nContext:\n${context}`;

    // Try to call the Generative Language API using the function's service account
    // (recommended). If that fails (no permission) and an API key secret exists,
    // fall back to calling with ?key=API_KEY. Also attempt common API version
    // paths (v1, v1beta2, v1beta1) — some projects may expose different versions.
    // Prefer Gemini if available in the project; fallback to text-bison.
    const modelCandidates = [
      'googleai/gemini-2.5-flash',
      'gemini-2.5-flash'
    ];
    
    // Prepare request body for Gemini API
    const geminiBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024
      }
    };

    // Prepare request body for legacy models (text-bison)
    const legacyBody = {
      prompt: { text: prompt },
      temperature: 0.3,
      maxOutputTokens: 1024
    };

    // Helper to attempt a single URL with given headers
    async function tryUrl(url, headers, requestBody) {
      console.debug('Trying API endpoint:', url);
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(requestBody)
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '<no body>');
        console.debug('Generative API non-OK response:', resp.status, txt.slice(0, 400));
        const err = new Error(`Generative API returned ${resp.status}`);
        err.status = resp.status;
        err.body = txt;
        throw err;
      }
      return await resp.json();
    }

    // Attempt using service account token first
    try {
      const auth = new GoogleAuth();
      const client = await auth.getClient();
      const accessToken = (await client.getAccessToken())?.token || (await client.getAccessToken());
      if (!accessToken) throw new Error('Could not obtain access token from metadata');

      for (const modelName of modelCandidates) {
        const isGemini = modelName.startsWith('gemini');
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:${isGemini ? 'generateContent' : 'generateText'}`;
        console.info(`Attempting Generative API (service-account) at ${url}`);
        try {
          const requestBody = isGemini ? geminiBody : legacyBody;
          const payload = await tryUrl(url, { Authorization: `Bearer ${accessToken}` }, requestBody);
          // success
          console.info(`Generative API call succeeded using service-account auth (model: ${modelName})`);
          const answerText = isGemini 
            ? payload.candidates?.[0]?.content?.parts?.[0]?.text
            : payload.candidates?.[0]?.output;
          
          if (!answerText) {
            console.warn('Unexpected API response format:', JSON.stringify(payload));
            throw new Error('Unexpected API response format');
          }
          
          return { answer: answerText, sources: relevantDocs };
        } catch (e) {
          if (e.status === 404) {
            console.debug(`Generative API not found at ${url} (404), trying next model`);
            continue;
          }
          throw e;
        }
      }
      throw new Error('No compatible Generative API endpoint found');
    } catch (saError) {
      console.warn('Service-account auth failed or not permitted:', saError.message || saError);
      // If API key available, try that as fallback
      if (!apiKey) {
        console.error('No API key available to fall back to; rethrowing SA error');
        throw saError;
      }

      console.warn('Falling back to API key auth for Generative API');
      for (const modelName of modelCandidates) {
        const isGemini = modelName.startsWith('gemini');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:${isGemini ? 'generateContent' : 'generateText'}?key=${apiKey}`;
        console.info(`Attempting Generative API (API key) at ${url}`);
        try {
          const requestBody = isGemini ? geminiBody : legacyBody;
          const payload = await tryUrl(url, {}, requestBody);
          console.info(`Generative API call succeeded using API key (model: ${modelName})`);
          const answerText = isGemini 
            ? payload.candidates?.[0]?.content?.parts?.[0]?.text
            : payload.candidates?.[0]?.output;
          
          if (!answerText) {
            console.warn('Unexpected API response format:', JSON.stringify(payload));
            throw new Error('Unexpected API response format');
          }
          
          return { answer: answerText, sources: relevantDocs };
        } catch (e) {
          if (e.status === 404) {
            console.debug(`Generative API not found at ${url} with API key (404), trying next model`);
            continue;
          }
          throw e;
        }
      }
      throw new Error('No compatible Generative API endpoint found with API key');
    }

  } catch (error) {
    console.error('AI Query Error:', error);
    throw new HttpsError('internal', `AI processing failed: ${error.message}`);
  }
});

// Define common stop words to filter from query
const stopWords = new Set(['a', 'an', 'and', 'the', 'in', 'on', 'of', 'for', 'to', 'with', 'is', 'are', 'was', 'were']);
const METADATA_FIELDS_TO_SEARCH = ['_Subject', 'Notes', 'File Name', '_From', '_To', '_CC'];
const MAX_CONTEXT_DOCS = 5;
const APP_ID = 'eDiscovery-App';

/**
 * Searches Firestore metadata to find relevant documents.
 */
async function findRelevantDocsByMetadata(query, userId) {
  // Only filter out common stop words, keep all lengths and special chars
  const keywords = query.toLowerCase().split(' ')
    .filter(k => k.trim() && !stopWords.has(k));  // Keep non-empty terms that aren't stop words

  console.log('Search keywords:', keywords);

  if (keywords.length === 0) {
    console.log('No valid search keywords after filtering');
    return [];
  }

  const docsRef = db.collection(`artifacts/${APP_ID}/users/${userId}/docs`);
  const snapshot = await docsRef.get();
  
  const allDocuments = [];
  snapshot.forEach(doc => allDocuments.push({ id: doc.id, ...doc.data() }));
  
  console.log('Total documents to search:', allDocuments.length);

  // First pass: score based on metadata
  const scoredDocs = await Promise.all(allDocuments.map(async doc => {
    let score = 0;
    const docId = doc.id.toLowerCase();
    const matches = [];
    
    // Check document ID
    const idMatches = keywords.filter(k => docId.includes(k));
    if (idMatches.length > 0) {
      score += idMatches.length * 5;
      matches.push(`ID matches: ${idMatches.join(', ')}`);
    }

    // Check metadata fields
    for (const field of METADATA_FIELDS_TO_SEARCH) {
      const value = (doc[field] || '').toLowerCase();
      const fieldMatches = keywords.filter(k => value.includes(k));
      if (fieldMatches.length > 0) {
        score += fieldMatches.length * (field === '_Subject' || field === 'Notes' ? 3 : 1);
        matches.push(`${field} matches: ${fieldMatches.join(', ')}`);
      }
    }

    // Check document text content if available
    if (doc.textStoragePath) {
      try {
        const text = await fetchDocumentText(doc, userId);
        if (text && !text.startsWith('[')) { // Skip error messages that start with [
          const textLower = text.toLowerCase();
          const contentMatches = keywords.filter(k => textLower.includes(k));
          if (contentMatches.length > 0) {
            // Content matches are valuable but shouldn't overwhelm metadata matches
            score += contentMatches.length * 2;
            matches.push(`Content matches: ${contentMatches.join(', ')}`);
          }
        }
      } catch (error) {
        console.error(`Error searching text for ${doc.id}:`, error);
      }
    }

    return { doc, score, matches };
  }));

  // Filter and sort the scored documents
  const matchedDocs = scoredDocs
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // Log match details for debugging
  matchedDocs.forEach(({ doc, score, matches }) => {
    console.log(`Document ${doc.id} scored ${score}:`, matches);
  });

  console.log(`Found ${matchedDocs.length} matching documents`);
  
  const results = matchedDocs.slice(0, MAX_CONTEXT_DOCS).map(item => item.doc);
  console.log(`Returning top ${results.length} documents for context`);
  
  return results;
}

/**
 * Fetches the text content for a given document from Firebase Storage.
 */
async function fetchDocumentText(doc, userId) {
  if (!doc.textStoragePath) {
    return `[No text path for ${doc.id}]`;
  }
  
  try {
    const fileRef = storage.bucket().file(doc.textStoragePath);
    const [buffer] = await fileRef.download();
    
    try {
        const text = buffer.toString('utf16le');
        if (text.includes('e') || text.includes('t')) return text;
    } catch (e) {}
    
    return buffer.toString('utf8');

  } catch (error) {
    console.error(`Failed to fetch text for ${doc.id}:`, error.message);
    return `[Error fetching text for ${doc.id}]`;
  }
}