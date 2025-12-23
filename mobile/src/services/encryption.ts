import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import { getSecureItem, setSecureItem } from '../utils/storage';

const KEY_STORAGE_KEY = 'encryption_keypair';

interface KeyPair {
  publicKey: string;
  secretKey: string;
}

let cachedKeyPair: nacl.BoxKeyPair | null = null;

// Generate or retrieve existing key pair
export const getOrCreateKeyPair = async (): Promise<KeyPair> => {
  // Check cache first
  if (cachedKeyPair) {
    return {
      publicKey: naclUtil.encodeBase64(cachedKeyPair.publicKey),
      secretKey: naclUtil.encodeBase64(cachedKeyPair.secretKey),
    };
  }

  // Try to load from secure storage
  const storedKeys = await getSecureItem(KEY_STORAGE_KEY);
  if (storedKeys) {
    try {
      const parsed = JSON.parse(storedKeys);
      cachedKeyPair = {
        publicKey: naclUtil.decodeBase64(parsed.publicKey),
        secretKey: naclUtil.decodeBase64(parsed.secretKey),
      };
      return parsed;
    } catch (error) {
      console.error('Error parsing stored keys:', error);
    }
  }

  // Generate new key pair
  cachedKeyPair = nacl.box.keyPair();
  const keyPair: KeyPair = {
    publicKey: naclUtil.encodeBase64(cachedKeyPair.publicKey),
    secretKey: naclUtil.encodeBase64(cachedKeyPair.secretKey),
  };

  // Store in secure storage
  await setSecureItem(KEY_STORAGE_KEY, JSON.stringify(keyPair));

  return keyPair;
};

// Get public key for sharing with others
export const getPublicKey = async (): Promise<string> => {
  const keyPair = await getOrCreateKeyPair();
  return keyPair.publicKey;
};

// Encrypt message for a recipient
export const encryptMessage = async (
  message: string,
  recipientPublicKey: string
): Promise<{ encrypted: string; nonce: string }> => {
  const keyPair = await getOrCreateKeyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageBytes = naclUtil.decodeUTF8(message);
  const recipientKeyBytes = naclUtil.decodeBase64(recipientPublicKey);
  const secretKeyBytes = naclUtil.decodeBase64(keyPair.secretKey);

  const encrypted = nacl.box(
    messageBytes,
    nonce,
    recipientKeyBytes,
    secretKeyBytes
  );

  if (!encrypted) {
    throw new Error('Encryption failed');
  }

  return {
    encrypted: naclUtil.encodeBase64(encrypted),
    nonce: naclUtil.encodeBase64(nonce),
  };
};

// Decrypt message from a sender
export const decryptMessage = async (
  encryptedMessage: string,
  nonce: string,
  senderPublicKey: string
): Promise<string> => {
  const keyPair = await getOrCreateKeyPair();
  const encryptedBytes = naclUtil.decodeBase64(encryptedMessage);
  const nonceBytes = naclUtil.decodeBase64(nonce);
  const senderKeyBytes = naclUtil.decodeBase64(senderPublicKey);
  const secretKeyBytes = naclUtil.decodeBase64(keyPair.secretKey);

  const decrypted = nacl.box.open(
    encryptedBytes,
    nonceBytes,
    senderKeyBytes,
    secretKeyBytes
  );

  if (!decrypted) {
    throw new Error('Decryption failed');
  }

  return naclUtil.encodeUTF8(decrypted);
};

// Encrypt for group (using shared secret)
export const encryptForGroup = (
  message: string,
  sharedSecret: string
): { encrypted: string; nonce: string } => {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const messageBytes = naclUtil.decodeUTF8(message);
  const keyBytes = naclUtil.decodeBase64(sharedSecret);

  const encrypted = nacl.secretbox(messageBytes, nonce, keyBytes);

  if (!encrypted) {
    throw new Error('Encryption failed');
  }

  return {
    encrypted: naclUtil.encodeBase64(encrypted),
    nonce: naclUtil.encodeBase64(nonce),
  };
};

// Decrypt group message
export const decryptFromGroup = (
  encryptedMessage: string,
  nonce: string,
  sharedSecret: string
): string => {
  const encryptedBytes = naclUtil.decodeBase64(encryptedMessage);
  const nonceBytes = naclUtil.decodeBase64(nonce);
  const keyBytes = naclUtil.decodeBase64(sharedSecret);

  const decrypted = nacl.secretbox.open(encryptedBytes, nonceBytes, keyBytes);

  if (!decrypted) {
    throw new Error('Decryption failed');
  }

  return naclUtil.encodeUTF8(decrypted);
};

// Generate a shared secret for group
export const generateGroupSecret = (): string => {
  const secret = nacl.randomBytes(nacl.secretbox.keyLength);
  return naclUtil.encodeBase64(secret);
};

// Hash for message verification
export const hashMessage = (message: string): string => {
  const messageBytes = naclUtil.decodeUTF8(message);
  const hash = nacl.hash(messageBytes);
  return naclUtil.encodeBase64(hash);
};

// Verify message hash
export const verifyMessageHash = (message: string, expectedHash: string): boolean => {
  const actualHash = hashMessage(message);
  return actualHash === expectedHash;
};

// Clear cached keys (for logout)
export const clearEncryptionKeys = async (): Promise<void> => {
  cachedKeyPair = null;
  conversationSecrets.clear();
  // Note: We don't delete from secure storage to preserve keys
  // If you want to delete, uncomment the following:
  // await removeSecureItem(KEY_STORAGE_KEY);
};

// ===== Conversation-based encryption (for chat messages) =====

const CONVERSATION_SECRET_PREFIX = 'conv_secret_';
const conversationSecrets: Map<string, string> = new Map();

/**
 * Get or create a secret key for a specific conversation
 * This is used for encrypting messages in both private and group chats
 */
export const getOrCreateConversationSecret = async (conversationId: string): Promise<string> => {
  // Check memory cache
  if (conversationSecrets.has(conversationId)) {
    return conversationSecrets.get(conversationId)!;
  }

  // Check storage
  const storageKey = `${CONVERSATION_SECRET_PREFIX}${conversationId}`;
  const storedSecret = await getSecureItem(storageKey);

  if (storedSecret) {
    conversationSecrets.set(conversationId, storedSecret);
    return storedSecret;
  }

  // Generate new secret for this conversation
  const secret = generateGroupSecret();
  await setSecureItem(storageKey, secret);
  conversationSecrets.set(conversationId, secret);

  return secret;
};

/**
 * Encrypt a message for a conversation
 * Returns an encrypted string with embedded nonce
 */
export const encryptForConversation = async (
  conversationId: string,
  plainText: string
): Promise<string> => {
  if (!plainText) return plainText;

  const secret = await getOrCreateConversationSecret(conversationId);
  const { encrypted, nonce } = encryptForGroup(plainText, secret);

  // Combine nonce and encrypted data with a separator
  return `${nonce}:${encrypted}`;
};

/**
 * Decrypt a message from a conversation
 * Expects format: nonce:encryptedData
 */
export const decryptFromConversation = async (
  conversationId: string,
  cipherText: string
): Promise<string> => {
  if (!cipherText) return cipherText;

  // Check if the message is encrypted (has the nonce:data format)
  if (!cipherText.includes(':')) {
    // Not encrypted or legacy message, return as-is
    return cipherText;
  }

  try {
    const [nonce, encrypted] = cipherText.split(':');
    if (!nonce || !encrypted) {
      return cipherText;
    }

    const secret = await getOrCreateConversationSecret(conversationId);
    return decryptFromGroup(encrypted, nonce, secret);
  } catch (error) {
    console.warn('Failed to decrypt message, returning original:', error);
    // Return original text for backwards compatibility
    return cipherText;
  }
};

/**
 * Check if text appears to be encrypted
 * Encrypted messages have format: base64Nonce:base64Data
 */
export const isMessageEncrypted = (text: string): boolean => {
  if (!text || !text.includes(':')) return false;

  const parts = text.split(':');
  if (parts.length !== 2) return false;

  // Check if both parts look like base64
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return base64Regex.test(parts[0]) && base64Regex.test(parts[1]);
};

/**
 * Set a conversation secret (for when receiving from another device or group invite)
 */
export const setConversationSecret = async (
  conversationId: string,
  secret: string
): Promise<void> => {
  const storageKey = `${CONVERSATION_SECRET_PREFIX}${conversationId}`;
  await setSecureItem(storageKey, secret);
  conversationSecrets.set(conversationId, secret);
};

/**
 * Export conversation secret (for sharing with other devices or group members)
 */
export const exportConversationSecret = async (conversationId: string): Promise<string> => {
  return getOrCreateConversationSecret(conversationId);
};
