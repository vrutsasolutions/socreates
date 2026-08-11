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
 * Transparently encrypts/decrypts PayoutAccount.payoutAccountNumber
 * using AES-256-GCM — same algorithm, same key as PanCryptoConverter.
 *
 * A fresh random 12-byte IV is generated per encryption, so encrypting
 * the same account number twice never produces the same stored value.
 */
@Converter
public class AccountNumberCryptoConverter
        implements AttributeConverter<String, String> {

    private static final String ALGO = "AES/GCM/NoPadding";
    private static final int IV_LENGTH_BYTES = 12;
    private static final int TAG_LENGTH_BITS = 128;

    private static SecretKeySpec keySpec() {
        String base64Key = PanEncryptionKeyHolder.getKey();

        if (base64Key == null || base64Key.isBlank()) {
            throw new IllegalStateException(
                    "PAN_ENCRYPTION_KEY is not set. "
                            + "Add it to Backend/.env or your environment, "
                            + "then restart the app."
            );
        }

        byte[] keyBytes = Base64.getDecoder().decode(base64Key);
        return new SecretKeySpec(keyBytes, "AES");
    }

    @Override
    public String convertToDatabaseColumn(String plainAccountNumber) {
        if (plainAccountNumber == null
                || plainAccountNumber.isBlank()) {
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
                    plainAccountNumber.trim()
                            .getBytes(StandardCharsets.UTF_8)
            );

            byte[] combined =
                    new byte[iv.length + cipherText.length];

            System.arraycopy(
                    iv, 0, combined, 0, iv.length
            );
            System.arraycopy(
                    cipherText, 0, combined,
                    iv.length, cipherText.length
            );

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new IllegalStateException(
                    "Failed to encrypt account number", e
            );
        }
    }

    @Override
    public String convertToEntityAttribute(String storedValue) {
        if (storedValue == null || storedValue.isBlank()) {
            return null;
        }

        try {
            byte[] combined =
                    Base64.getDecoder().decode(storedValue);

            byte[] iv = new byte[IV_LENGTH_BYTES];
            byte[] cipherText =
                    new byte[combined.length - IV_LENGTH_BYTES];

            System.arraycopy(
                    combined, 0, iv, 0, IV_LENGTH_BYTES
            );
            System.arraycopy(
                    combined, IV_LENGTH_BYTES,
                    cipherText, 0, cipherText.length
            );

            Cipher cipher = Cipher.getInstance(ALGO);
            cipher.init(
                    Cipher.DECRYPT_MODE,
                    keySpec(),
                    new GCMParameterSpec(TAG_LENGTH_BITS, iv)
            );

            byte[] plainBytes = cipher.doFinal(cipherText);
            return new String(plainBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException(
                    "Failed to decrypt account number", e
            );
        }
    }
}