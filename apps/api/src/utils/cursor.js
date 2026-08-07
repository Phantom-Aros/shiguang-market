/**
 * @param {{ createdAt: string | Date; postId: string }} payload
 */
export function encodeCursor({ createdAt, postId }) {
  const createdAtIso =
    createdAt instanceof Date ? createdAt.toISOString() : String(createdAt);
  return Buffer.from(`${createdAtIso}|${postId}`).toString('base64url');
}

/**
 * @param {string | undefined} cursor
 */
export function decodeCursor(cursor) {
  if (!cursor) return null;

  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const separatorIndex = decoded.lastIndexOf('|');
    if (separatorIndex <= 0) return null;

    const createdAt = decoded.slice(0, separatorIndex);
    const postId = decoded.slice(separatorIndex + 1);
    if (!createdAt || !postId) return null;

    return { createdAt, postId };
  } catch {
    return null;
  }
}
