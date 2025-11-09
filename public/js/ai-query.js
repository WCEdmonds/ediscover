// AI Query functionality
export async function runAiQuery(functions, userId, query) {
    if (!query || !userId) {
        throw new Error("Please enter a query and make sure you're signed in.");
    }

    // Call our Firebase Function
    const queryDocuments = httpsCallable(functions, 'queryDocuments');
    const result = await queryDocuments({ query, userId });

    return result.data;
}