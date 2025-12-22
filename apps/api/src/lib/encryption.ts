/**
 * AES-256-GCM Encryption Service
 * 
 * Used for encrypting sensitive data like Baselinker API tokens.
 * Encryption key must be stored in BASELINKER_ENCRYPTION_KEY env variable.
 */

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get encryption key from environment variable
 * Key must be 32 bytes (256 bits) as hex string (64 characters)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.BASELINKER_ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('BASELINKER_ENCRYPTION_KEY environment variable is not set');
  }
  
  if (key.length !== 64) {
    throw new Error('BASELINKER_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  
  return Buffer.from(key, 'hex');
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypt plaintext using AES-256-GCM
 * @param plaintext - The text to encrypt
 * @returns Encrypted data with ciphertext, IV, and auth tag (all as hex strings)
 */
export function encryptToken(plaintext: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    ciphertext,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * @param ciphertext - The encrypted text (hex string)
 * @param iv - The initialization vector (hex string)
 * @param authTag - The authentication tag (hex string)
 * @returns Decrypted plaintext
 */
export function decryptToken(ciphertext: string, iv: string, authTag: string): string {
  const key = getEncryptionKey();
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'hex'),
    { authTagLength: AUTH_TAG_LENGTH }
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');
  
  return plaintext;
}

/**
 * Generate a new 32-byte encryption key
 * Use this to generate BASELINKER_ENCRYPTION_KEY
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Mask a token for display (show first 8 and last 4 characters)
 * @param token - The token to mask
 * @returns Masked token like "12345678...WXYZ"
 */
export function maskToken(token: string): string {
  if (token.length <= 12) {
    return '****';
  }
  return `${token.substring(0, 8)}...${token.substring(token.length - 4)}`;
}
