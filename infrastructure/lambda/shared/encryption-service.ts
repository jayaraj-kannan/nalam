// Client-Side Encryption Service
// Requirements: 8.1 - AES-256 encryption for sensitive data

import { KMSClient, EncryptCommand, DecryptCommand, GenerateDataKeyCommand } from '@aws-sdk/client-kms';
import * as crypto from 'crypto';

const kmsClient = new KMSClient({});
const KMS_KEY_ID = process.env.KMS_KEY_ID || '';

/**
 * Encrypt sensitive data using AWS KMS
 * Requirements: 8.1 - Client-side encryption for sensitive data
 */
export async function encryptWithKMS(plaintext: string): Promise<string> {
  const command = new EncryptCommand({
    KeyId: KMS_KEY_ID,
    Plaintext: Buffer.from(plaintext, 'utf-8'),
  });

  const response = await kmsClient.send(command);
  return Buffer.from(response.CiphertextBlob!).toString('base64');
}

/**
 * Decrypt data encrypted with AWS KMS
 * Requirements: 8.1 - Decrypt KMS-encrypted data
 */
export async function decryptWithKMS(ciphertext: string): Promise<string> {
  const command = new DecryptCommand({
    CiphertextBlob: Buffer.from(ciphertext, 'base64'),
  });

  const response = await kmsClient.send(command);
  return Buffer.from(response.Plaintext!).toString('utf-8');
}

/**
 * Generate a data encryption key for envelope encryption
 * Requirements: 8.1 - Envelope encryption pattern
 */
export async function generateDataKey(): Promise<{ plaintext: Buffer; encrypted: string }> {
  const command = new GenerateDataKeyCommand({
    KeyId: KMS_KEY_ID,
    KeySpec: 'AES_256',
  });

  const response = await kmsClient.send(command);
  return {
    plaintext: Buffer.from(response.Plaintext!),
    encrypted: Buffer.from(response.CiphertextBlob!).toString('base64'),
  };
}

/**
 * Encrypt data using AES-256-GCM with envelope encryption
 * Requirements: 8.1 - AES-256 encryption for data at rest
 */
export async function encryptData(data: string): Promise<{ encrypted: string; dataKey: string; iv: string; authTag: string }> {
  // Generate a data encryption key
  const { plaintext: dataKey, encrypted: encryptedDataKey } = await generateDataKey();

  // Generate initialization vector
  const iv = crypto.randomBytes(16);

  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv);

  // Encrypt data
  let encrypted = cipher.update(data, 'utf-8', 'base64');
  encrypted += cipher.final('base64');

  // Get authentication tag
  const authTag = cipher.getAuthTag().toString('base64');

  return {
    encrypted,
    dataKey: encryptedDataKey,
    iv: iv.toString('base64'),
    authTag,
  };
}

/**
 * Decrypt data encrypted with AES-256-GCM
 * Requirements: 8.1 - Decrypt AES-256 encrypted data
 */
export async function decryptData(
  encrypted: string,
  encryptedDataKey: string,
  iv: string,
  authTag: string
): Promise<string> {
  // Decrypt the data key using KMS
  const dataKey = await decryptWithKMS(encryptedDataKey);

  // Create decipher
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(dataKey, 'base64'),
    Buffer.from(iv, 'base64')
  );

  // Set authentication tag
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  // Decrypt data
  let decrypted = decipher.update(encrypted, 'base64', 'utf-8');
  decrypted += decipher.final('utf-8');

  return decrypted;
}

/**
 * Encrypt sensitive health data fields
 * Requirements: 8.1 - Selective field encryption
 */
export async function encryptSensitiveFields<T extends Record<string, unknown>>(
  data: T,
  sensitiveFields: (keyof T)[]
): Promise<T & { _encryption?: Record<string, { dataKey: string; iv: string; authTag: string }> }> {
  const encrypted = { ...data };
  const encryptionMetadata: Record<string, { dataKey: string; iv: string; authTag: string }> = {};

  for (const field of sensitiveFields) {
    if (data[field] !== undefined && data[field] !== null) {
      const value = typeof data[field] === 'string' 
        ? data[field] as string 
        : JSON.stringify(data[field]);
      
      const { encrypted: encryptedValue, dataKey, iv, authTag } = await encryptData(value);
      
      encrypted[field] = encryptedValue as T[keyof T];
      encryptionMetadata[field as string] = { dataKey, iv, authTag };
    }
  }

  return {
    ...encrypted,
    _encryption: encryptionMetadata,
  };
}

/**
 * Decrypt sensitive health data fields
 * Requirements: 8.1 - Decrypt selective fields
 */
export async function decryptSensitiveFields<T extends Record<string, unknown>>(
  data: T & { _encryption?: Record<string, { dataKey: string; iv: string; authTag: string }> },
  sensitiveFields: (keyof T)[]
): Promise<T> {
  const decrypted = { ...data };
  const encryptionMetadata = data._encryption || {};

  for (const field of sensitiveFields) {
    if (data[field] !== undefined && encryptionMetadata[field as string]) {
      const { dataKey, iv, authTag } = encryptionMetadata[field as string];
      const encryptedValue = data[field] as string;
      
      const decryptedValue = await decryptData(encryptedValue, dataKey, iv, authTag);
      
      // Try to parse as JSON if it was originally an object
      try {
        decrypted[field] = JSON.parse(decryptedValue) as T[keyof T];
      } catch {
        decrypted[field] = decryptedValue as T[keyof T];
      }
    }
  }

  // Remove encryption metadata
  delete (decrypted as { _encryption?: unknown })._encryption;

  return decrypted;
}

/**
 * Hash sensitive data for indexing (one-way)
 * Requirements: 8.1 - Secure hashing for searchable fields
 */
export function hashForIndex(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
