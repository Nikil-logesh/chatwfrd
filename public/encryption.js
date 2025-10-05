// Simple end-to-end encryption library for chat
class ChatEncryption {
    constructor() {
        this.keyPair = null;
        this.otherPublicKey = null;
        this.sharedSecret = null;
    }

    // Generate key pair for this user
    async generateKeyPair() {
        try {
            this.keyPair = await window.crypto.subtle.generateKey(
                {
                    name: "ECDH",
                    namedCurve: "P-256"
                },
                false, // not extractable
                ["deriveKey"]
            );
            return this.keyPair;
        } catch (error) {
            console.error('Error generating key pair:', error);
            throw error;
        }
    }

    // Export public key to share with other user
    async exportPublicKey() {
        if (!this.keyPair) {
            throw new Error('Key pair not generated');
        }
        
        const exported = await window.crypto.subtle.exportKey(
            "raw",
            this.keyPair.publicKey
        );
        
        return Array.from(new Uint8Array(exported));
    }

    // Import other user's public key
    async importOtherPublicKey(publicKeyArray) {
        try {
            const publicKeyBuffer = new Uint8Array(publicKeyArray).buffer;
            
            this.otherPublicKey = await window.crypto.subtle.importKey(
                "raw",
                publicKeyBuffer,
                {
                    name: "ECDH",
                    namedCurve: "P-256"
                },
                false,
                []
            );
            
            // Derive shared secret
            await this.deriveSharedSecret();
            return true;
        } catch (error) {
            console.error('Error importing public key:', error);
            return false;
        }
    }

    // Derive shared secret for encryption
    async deriveSharedSecret() {
        if (!this.keyPair || !this.otherPublicKey) {
            throw new Error('Keys not available');
        }

        const sharedKey = await window.crypto.subtle.deriveKey(
            {
                name: "ECDH",
                public: this.otherPublicKey
            },
            this.keyPair.privateKey,
            {
                name: "AES-GCM",
                length: 256
            },
            false,
            ["encrypt", "decrypt"]
        );

        this.sharedSecret = sharedKey;
    }

    // Encrypt message
    async encryptMessage(message) {
        if (!this.sharedSecret) {
            throw new Error('Shared secret not available');
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            this.sharedSecret,
            data
        );

        return {
            encrypted: Array.from(new Uint8Array(encrypted)),
            iv: Array.from(iv)
        };
    }

    // Decrypt message
    async decryptMessage(encryptedData, iv) {
        if (!this.sharedSecret) {
            throw new Error('Shared secret not available');
        }

        try {
            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: new Uint8Array(iv)
                },
                this.sharedSecret,
                new Uint8Array(encryptedData)
            );

            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            return '[Decryption Failed]';
        }
    }

    // Check if encryption is ready
    isReady() {
        return this.sharedSecret !== null;
    }
}