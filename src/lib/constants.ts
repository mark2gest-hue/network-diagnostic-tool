export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';
  return new TextEncoder().encode(secret);
};
