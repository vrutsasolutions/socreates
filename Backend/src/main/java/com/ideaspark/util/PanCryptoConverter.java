package com.ideaspark.util;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Transparently encrypts/decrypts PayoutAccount.panNumber using AES-256-GCM
 * before it hits the database, and decrypts it back when Hibernate loads
 * the entity. No other code needs to change - it's just a plain String
 * everywhere except the DB column.
 *
 * Key comes from the PAN_ENCRYPTION_KEY env var: a base64-encoded 32-byte
 * (256-bit) AES key. Generate one with:
 *   openssl rand -base64 32
 *
 * A fresh random 12-byte IV is generated per encryption and stored
 * alongside the ciphertext (IV + ciphertext, base64-encoded together), so
 * encrypting the same PAN twice never produces the same stored value.
 */
@Converter
public class PanCryptoConverter implements AttributeConverter<String, String> {

    private static final String ALGO = "AES/GCM/NoPadding";
    private static final int IV_LENGTH_BYTES = 12;
    private static final int TAG_LENGTH_BITS = 128;

    private static SecretKeySpec keySpec() {
        // Resolved by Spring (real env var, system property, or .env via
        // spring-dotenv - same as DB_PASSWORD/JWT_SECRET) and cached by
        // PanEncryptionKeyHolder at startup.
        String base64Key = PanEncryptionKeyHolder.getKey();

        if (base64Key == null || base64Key.isBlank()) {
            throw new IllegalStateException(
                    "PAN_ENCRYPTION_KEY is not set. Add it to Backend/.env "
                            + "or your environment, then restart the app."
            );
        }

        byte[] keyBytes = Base64.getDecoder().decode(base64Key);
        return new SecretKeySpec(keyBytes, "AES");
    }

    @Override
    public String convertToDatabaseColumn(String plainPan) {
        if (plainPan == null || plainPan.isBlank()) {
            return null;
        }

        try {
            byte[] iv = new byte[IV_LENGTH_BYTES];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGO);
            cipher.init(
                    Cipher.ENCRYPT_MODE,
                    keySpec(),
                    new GCMParameterSpec(TAG_LENGTH_BITS, iv)
            );

            byte[] cipherText = cipher.doFinal(
                    plainPan.trim().toUpperCase().getBytes(StandardCharsets.UTF_8)
            );

            byte[] combined = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to encrypt PAN number", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String storedValue) {
        if (storedValue == null || storedValue.isBlank()) {
            return null;
        }

        try {
            byte[] combined = Base64.getDecoder().decode(storedValue);

            byte[] iv = new byte[IV_LENGTH_BYTES];
            byte[] cipherText = new byte[combined.length - IV_LENGTH_BYTES];
            System.arraycopy(combined, 0, iv, 0, IV_LENGTH_BYTES);
            System.arraycopy(combined, IV_LENGTH_BYTES, cipherText, 0, cipherText.length);

            Cipher cipher = Cipher.getInstance(ALGO);
            cipher.init(
                    Cipher.DECRYPT_MODE,
                    keySpec(),
                    new GCMParameterSpec(TAG_LENGTH_BITS, iv)
            );

            byte[] plainBytes = cipher.doFinal(cipherText);
            return new String(plainBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to decrypt PAN number", e);
        }
    }
}