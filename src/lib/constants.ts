export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production.');
    }
    return new TextEncoder().encode('fallback-secret-for-dev-only');
  }
  return new TextEncoder().encode(secret);
};

