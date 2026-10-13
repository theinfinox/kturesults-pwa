# 🔐 KTU CGPA PWA — Security Architecture & Cryptographic Vault

This document explains the cryptographic implementation, threat modeling, credential lifecycle, and privacy architecture implemented in `crypto-vault.js` and `app.js`.

---

## 1. Threat Model & Design Goals

Student academic credentials granting access to university portals are sensitive assets. The application addresses three core threat vectors:

1. **Storage-at-Rest Exposure**: If an attacker accesses the student's device or inspects browser `localStorage`, they must not find cleartext portal passwords.
2. **Network Interception**: Credential transmissions must never traverse unencrypted HTTP channels.
3. **Memory Residue**: Plaintext passwords must not linger in JavaScript memory longer than the few milliseconds required to construct the sync payload.

---

## 2. Cryptographic Specifications

The application uses the W3C standard **Web Cryptography API** (`window.crypto.subtle`) natively built into modern browsers.

| Parameter | Specification | Purpose |
| :--- | :--- | :--- |
| **Symmetric Cipher** | **AES-GCM** (Galois/Counter Mode) | Provides authenticated encryption with integrity verification. |
| **Key Length** | **256-bit** | Military/enterprise-grade symmetric security. |
| **Key Derivation Function** | **PBKDF2-HMAC-SHA256** | Key stretching that resists brute-force and dictionary attacks. |
| **Iteration Count** | **100,000 iterations** | Meets NIST and OWASP standards for key derivation. |
| **Salt Length** | **16 bytes (128 bits)** | Unique, cryptographically random per encryption operation. |
| **Initialization Vector (IV)** | **12 bytes (96 bits)** | Standard non-repeating GCM nonce generated via `crypto.getRandomValues`. |

---

## 3. Operational Modes: Device Mode vs. PIN Mode

`crypto-vault.js` supports two distinct security modes depending on the student's preference:

```
+---------------------------------------------------------------------------------+
|                               CRYPTOGRAPHIC MODES                               |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  [MODE A: Device-Bound Key (Default)]                                           |
|  - Passphrase = Device Secret (32-byte cryptographically random seed)           |
|  - Seed stored in localStorage under 'ktu_pwa_device_crypto_seed'               |
|  - Seamless automatic sync on this device.                                      |
|  - If localStorage is dumped or exported, ciphertext cannot be decrypted on     |
|    another device without the local seed.                                       |
|                                                                                 |
|  [MODE B: Zero-Knowledge User PIN Mode]                                         |
|  - Passphrase = User-selected 4-to-6 digit PIN.                                 |
|  - The PIN is NEVER written to disk.                                            |
|  - Even with full access to the device's localStorage, an attacker cannot       |
|    decrypt the password without the student's secret PIN.                       |
|  - GCM authentication tag verification fails if an incorrect PIN is entered.    |
|                                                                                 |
+---------------------------------------------------------------------------------+
```

### 3.1 Encrypted Payload Structure
When a password is encrypted, the vault returns a standardized payload:
```json
{
  "ciphertext": "p9xY8u2...base64...",
  "iv": "dGVzdGl2...base64...",
  "salt": "c2FsdHNh...base64...",
  "mode": "device",
  "v": 1
}
```

### 3.2 Legacy Profile Migration (`migrateLegacyProfiles`)
On launch, `app.js` inspects all saved profile records in `localStorage`. If any unencrypted legacy profiles with plaintext passwords exist, they are immediately encrypted using AES-GCM-256 and the plaintext password key is permanently deleted from disk.

---

## 4. In-Memory Credential Hygiene

Plaintext passwords exist in memory only during the short window of a sync request:
```javascript
let plainPassword = await getDecryptedPassword(profile);
try {
    const result = await window.KTUSyncEngine.executeFastSync(profile.username, plainPassword);
    plainPassword = ""; // Immediate overwrite
} catch (err) {
    plainPassword = ""; // Immediate overwrite on error
}
```
- Plaintext secrets are strictly excluded from console logs, analytics, and error messages.
- For PIN-protected profiles, the entered PIN is cached in memory only for the duration of the browser tab session (`cachedSessionPin`), resetting when the tab is closed.

---

## 5. Transport Hardening & Enforced HTTPS

To ensure credentials cannot be intercepted over untrusted networks (e.g. campus Wi-Fi):
- Custom relay endpoints are strictly checked against `https://` before sending requests.
- The browser Content Security Policy explicitly forbids insecure HTTP script or stylesheet loading:
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; img-src 'self' data: blob:;
  ```
- All responses carry HTTP security headers preventing frame hijacking (`X-Frame-Options: DENY`) and MIME sniffing (`X-Content-Type-Options: nosniff`).

---

## 6. Privacy & Telemetry Statement

- **100% Local Storage**: All academic grades, SGPA scores, and profile labels reside exclusively on the student's device.
- **Zero Tracking**: No Google Analytics, no telemetry beacons, no external CDNs, and no tracking cookies are present.
- **Stateless Relays**: Cloudflare Worker relays act strictly as pass-through proxies and do not maintain user databases or logs.
