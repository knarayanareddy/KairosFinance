import { isSqliteVecLoaded } from './db.js';
function assertVecLoaded() {
    if (!isSqliteVecLoaded()) {
        throw new Error('[vector] sqlite-vec is not loaded. Pattern similarity search is unavailable. ' +
            'Ensure sqlite-vec is installed and getDb() was called before using vector operations.');
    }
}
/**
 * Inserts or replaces a pattern's embedding vector.
 * The embedding must be a float array of exactly 768 dimensions
 * (nomic-embed-text output size).
 */
export function upsertPatternEmbedding(db, patternId, embedding) {
    assertVecLoaded();
    if (embedding.length !== 768) {
        throw new Error(`[vector] Expected 768-dimensional embedding, got ${embedding.length}`);
    }
    // vec0 with TEXT PRIMARY KEY supports INSERT OR REPLACE
    db.prepare(`INSERT OR REPLACE INTO pattern_embeddings(pattern_id, embedding)
     VALUES (?, ?)`).run(patternId, JSON.stringify(embedding));
}
/**
 * Finds the k nearest patterns to the query embedding using cosine distance.
 * Returns results sorted by distance ascending (closest first).
 *
 * @param queryEmbedding  768-dimensional float array from Ollama
 * @param limit           Maximum number of results to return
 */
export function searchSimilarPatterns(db, queryEmbedding, limit = 5) {
    assertVecLoaded();
    if (queryEmbedding.length !== 768) {
        throw new Error(`[vector] Expected 768-dimensional query embedding, got ${queryEmbedding.length}`);
    }
    const rows = db
        .prepare(`SELECT pattern_id, distance
       FROM pattern_embeddings
       WHERE embedding MATCH ?
         AND k = ?
       ORDER BY distance`)
        .all(JSON.stringify(queryEmbedding), limit);
    return rows.map((row) => ({
        patternId: row.pattern_id,
        distance: row.distance,
    }));
}
/**
 * Deletes the embedding for a pattern (e.g., when the pattern is removed).
 */
export function deletePatternEmbedding(db, patternId) {
    assertVecLoaded();
    db.prepare(`DELETE FROM pattern_embeddings WHERE pattern_id = ?`).run(patternId);
}
