export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production.');
    }
    return new TextEncoder().encode('fallback-secret-for-dev-only-32-chars-long!');
  }

  // Prevenzione attacchi dizionario / brute-force offline su HS256: richiede almeno 32 caratteri in produzione
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be at least 32 characters long in production.');
  }

  return new TextEncoder().encode(secret);
};

