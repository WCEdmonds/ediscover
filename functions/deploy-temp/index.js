import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

import { Genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/google-genai';
import * as z from 'zod';

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();
const storage = getStorage();

// Initialize Genkit with plugins
const genkit = new Genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY })
  ],
  options: {
    logLevel: 'debug',
    enableTracingAndMetrics: true
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
  const keywords = query.toLowerCase().split(' ')
    .filter(k => k.length > 2 && !stopWords.has(k))
    .map(k => k.replace(/[^\w\s]/gi, ''));

  if (keywords.length === 0) {
    return [];
  }

  const docsRef = db.collection(`artifacts/${APP_ID}/users/${userId}/docs`);
  const snapshot = await docsRef.get();
  
  const allDocuments = [];
  snapshot.forEach(doc => allDocuments.push({ id: doc.id, ...doc.data() }));

  const scoredDocs = allDocuments.map(doc => {
    let score = 0;
    const docId = doc.id.toLowerCase();
    
    if (keywords.some(k => docId.includes(k))) score += 5;

    for (const field of METADATA_FIELDS_TO_SEARCH) {
      const value = (doc[field] || '').toLowerCase();
      if (keywords.some(k => value.includes(k))) {
        score += (field === '_Subject' || field === 'Notes') ? 3 : 1;
      }
    }
    return { doc, score };
  })
  .filter(item => item.score > 0)
  .sort((a, b) => b.score - a.score);

  return scoredDocs.slice(0, MAX_CONTEXT_DOCS).map(item => item.doc);
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

// Create callable function for AI queries
export const queryDocuments = onCall({ 
  maxInstances: 10,
  memory: '1GiB',
  timeoutSeconds: 120
}, async (request) => {
  const { query, userId } = request.data;
  
  if (!query || !userId) {
    throw new HttpsError('invalid-argument', 'Query and userId are required');
  }

  try {
    // Find relevant documents
    const relevantDocs = await findRelevantDocsByMetadata(query, userId);
    
    if (relevantDocs.length === 0) {
      return { response: "No relevant documents found for your query." };
    }

    // Fetch text content for relevant docs
    const docsWithText = await Promise.all(
      relevantDocs.map(async doc => ({
        ...doc,
        text: await fetchDocumentText(doc, userId)
      }))
    );

    // Use Genkit to process the query
    const context = docsWithText
      .map(doc => `Document ${doc.id}:\n${doc.text}\n`)
      .join('\n\n');

    const response = await genkit.generateText({
      model: 'gemini-pro',
      prompt: `Based on the following documents, ${query}\n\nContext:\n${context}`,
      temperature: 0.3,
      maxOutputTokens: 1024
    });

    return { response: response.text, sources: relevantDocs };

  } catch (error) {
    console.error('AI Query Error:', error);
    throw new HttpsError('internal', `AI processing failed: ${error.message}`);
  }
});