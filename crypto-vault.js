/**
 * KTU CGPA Crypto Vault
 * Enterprise-grade client-side encryption using Web Cryptography API (window.crypto.subtle)
 * Standard: AES-GCM (256-bit) with PBKDF2-HMAC-SHA256 (100,000 iterations)
 * 100% Dependency-Free • Zero Third-Party CDNs
 */

(function(root) {
    const cryptoObj = typeof globalThis !== "undefined" && globalThis.crypto 
        ? globalThis.crypto 
        : (typeof window !== "undefined" ? window.crypto : null);

    if (!cryptoObj || !cryptoObj.subtle) {
        console.warn("[CryptoVault] Web Cryptography API (crypto.subtle) not available in this environment.");
    }

    const DEVICE_KEY_STORAGE = "ktu_pwa_device_crypto_seed";

    // Helper: ArrayBuffer <-> Base64
    function bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return (typeof btoa === "function") 
            ? btoa(binary) 
            : Buffer.from(binary, "binary").toString("base64");
    }

    function base64ToBuffer(base64) {
        const binary = (typeof atob === "function") 
            ? atob(base64) 
            : Buffer.from(base64, "base64").toString("binary");
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // Helper: String <-> UTF-8 Uint8Array
    function encodeUtf8(str) {
        return new TextEncoder().encode(str);
    }

    function decodeUtf8(buffer) {
        return new TextDecoder().decode(buffer);
    }

    // Generate or retrieve device-bound salt
    function getOrCreateDeviceSecret() {
        if (typeof localStorage === "undefined") {
            return "KTU_PWA_DEFAULT_DEV_SEED_128938129";
        }
        let secret = localStorage.getItem(DEVICE_KEY_STORAGE);
        if (!secret) {
            const randomBytes = new Uint8Array(32);
            cryptoObj.getRandomValues(randomBytes);
            secret = bufferToBase64(randomBytes.buffer);
            localStorage.setItem(DEVICE_KEY_STORAGE, secret);
        }
        return secret;
    }

    // Key Derivation: PBKDF2 -> AES-GCM (256-bit)
    async function deriveAesKey(passphrase, saltBuffer) {
        const subtle = cryptoObj.subtle;
        const keyMaterial = await subtle.importKey(
            "raw",
            encodeUtf8(passphrase),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        return subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: saltBuffer,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    /**
     * Encrypt a plaintext password
     * @param {string} plaintext - Raw student password
     * @param {string|null} pin - Optional 4-6 digit security PIN
     * @returns {Promise<Object>} Encrypted payload { ciphertext, iv, salt, mode }
     */
    async function encryptPassword(plaintext, pin = null) {
        if (!plaintext) return null;
        const subtle = cryptoObj.subtle;

        const salt = new Uint8Array(16);
        const iv = new Uint8Array(12); // Standard 96-bit IV for AES-GCM
        cryptoObj.getRandomValues(salt);
        cryptoObj.getRandomValues(iv);

        const passphrase = (pin && String(pin).trim()) 
            ? String(pin).trim() 
            : getOrCreateDeviceSecret();

        const key = await deriveAesKey(passphrase, salt);

        const ciphertextBuffer = await subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            encodeUtf8(plaintext)
        );

        return {
            ciphertext: bufferToBase64(ciphertextBuffer),
            iv: bufferToBase64(iv.buffer),
            salt: bufferToBase64(salt.buffer),
            mode: (pin && String(pin).trim()) ? "pin" : "device",
            v: 1
        };
    }

    /**
     * Decrypt an encrypted payload
     * @param {Object} payload - { ciphertext, iv, salt, mode }
     * @param {string|null} pin - Optional security PIN
     * @returns {Promise<string>} Decrypted plaintext password
     */
    async function decryptPassword(payload, pin = null) {
        if (!payload || !payload.ciphertext || !payload.iv || !payload.salt) {
            throw new Error("Invalid or corrupt encrypted payload.");
        }
        const subtle = cryptoObj.subtle;

        const saltBuffer = base64ToBuffer(payload.salt);
        const ivBuffer = base64ToBuffer(payload.iv);
        const ciphertextBuffer = base64ToBuffer(payload.ciphertext);

        let passphrase = "";
        if (payload.mode === "pin") {
            if (!pin) {
                const err = new Error("Security PIN required to unlock this profile.");
                err.pinRequired = true;
                throw err;
            }
            passphrase = String(pin).trim();
        } else {
            passphrase = getOrCreateDeviceSecret();
        }

        const key = await deriveAesKey(passphrase, saltBuffer);

        try {
            const decryptedBuffer = await subtle.decrypt(
                { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
                key,
                ciphertextBuffer
            );
            return decodeUtf8(decryptedBuffer);
        } catch (err) {
            if (payload.mode === "pin") {
                const pinErr = new Error("Incorrect Security PIN. Decryption failed.");
                pinErr.invalidPin = true;
                throw pinErr;
            }
            throw new Error("Failed to decrypt credentials on this device.");
        }
    }

    function isEncrypted(obj) {
        return Boolean(obj && typeof obj === "object" && obj.ciphertext && obj.iv && obj.salt);
    }

    const Vault = {
        encryptPassword,
        decryptPassword,
        isEncrypted,
        getOrCreateDeviceSecret
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = Vault;
    }
    if (typeof window !== "undefined") {
        window.KTUCryptoVault = Vault;
    }
})(typeof window !== "undefined" ? window : globalThis);
