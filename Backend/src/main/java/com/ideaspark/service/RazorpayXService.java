package com.ideaspark.service;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;

@Service
public class RazorpayXService {

    private static final String BASE_URL =
            "https://api.razorpay.com/v1";

    private static final Duration CONNECT_TIMEOUT =
            Duration.ofSeconds(15);

    private static final Duration REQUEST_TIMEOUT =
            Duration.ofSeconds(30);

    @Value("${razorpay.key-id:}")
    private String keyId;

    @Value("${razorpay.key-secret:}")
    private String keySecret;

    @Value("${razorpayx.account-number:}")
    private String sourceAccountNumber;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(CONNECT_TIMEOUT)
            .build();

    public boolean isConfigured() {
        return notBlank(keyId)
                && notBlank(keySecret)
                && notBlank(sourceAccountNumber);
    }

    public boolean hasApiCredentials() {
        return notBlank(keyId)
                && notBlank(keySecret);
    }

    // ── Contacts ─────────────────────────────────────────────────────────────

    public String createContact(
            String name,
            String email
    ) throws Exception {

        requireApiCredentials();

        if (!notBlank(email)) {
            throw new IllegalArgumentException(
                    "Creator email is required to create a Razorpay contact"
            );
        }

        JSONObject body = new JSONObject()
                .put(
                        "name",
                        notBlank(name)
                                ? name.trim()
                                : "SoCreate Creator"
                )
                .put("email", email.trim())
                .put("type", "vendor");

        JSONObject response = post(
                "/contacts",
                body,
                null
        );

        String contactId =
                response.optString("id", null);

        if (!notBlank(contactId)) {
            throw new IllegalStateException(
                    "Razorpay did not return a contact ID"
            );
        }

        return contactId;
    }

    // ── Fund accounts ────────────────────────────────────────────────────────

    public String createVpaFundAccount(
            String contactId,
            String vpa
    ) throws Exception {

        requireApiCredentials();
        requireText(contactId, "Razorpay contact ID");
        requireText(vpa, "UPI/VPA address");

        JSONObject body = new JSONObject()
                .put("contact_id", contactId.trim())
                .put("account_type", "vpa")
                .put(
                        "vpa",
                        new JSONObject()
                                .put("address", vpa.trim())
                );

        JSONObject response = post(
                "/fund_accounts",
                body,
                null
        );

        return extractFundAccountId(response);
    }

    public String createBankFundAccount(
            String contactId,
            String beneficiaryName,
            String ifsc,
            String accountNumber
    ) throws Exception {

        requireApiCredentials();
        requireText(contactId, "Razorpay contact ID");
        requireText(beneficiaryName, "Beneficiary name");
        requireText(ifsc, "IFSC");
        requireText(accountNumber, "Bank account number");

        JSONObject body = new JSONObject()
                .put("contact_id", contactId.trim())
                .put("account_type", "bank_account")
                .put(
                        "bank_account",
                        new JSONObject()
                                .put("name", beneficiaryName.trim())
                                .put(
                                        "ifsc",
                                        ifsc.trim().toUpperCase()
                                )
                                .put(
                                        "account_number",
                                        accountNumber.trim()
                                )
                );

        JSONObject response = post(
                "/fund_accounts",
                body,
                null
        );

        return extractFundAccountId(response);
    }

    public void deactivateFundAccount(
            String fundAccountId
    ) throws Exception {

        requireApiCredentials();
        requireText(
                fundAccountId,
                "Razorpay fund-account ID"
        );

        JSONObject response = patch(
                "/fund_accounts/"
                        + encodePathSegment(fundAccountId.trim()),
                new JSONObject().put("active", false)
        );

        if (response.has("active")
                && response.optBoolean("active", true)) {

            throw new IllegalStateException(
                    "Razorpay returned the fund account as active"
            );
        }
    }

    public void activateFundAccount(
            String fundAccountId
    ) throws Exception {

        requireApiCredentials();
        requireText(
                fundAccountId,
                "Razorpay fund-account ID"
        );

        JSONObject response = patch(
                "/fund_accounts/"
                        + encodePathSegment(fundAccountId.trim()),
                new JSONObject().put("active", true)
        );

        if (response.has("active")
                && !response.optBoolean("active", false)) {

            throw new IllegalStateException(
                    "Razorpay returned the fund account as inactive"
            );
        }
    }

    // ── Payouts ──────────────────────────────────────────────────────────────

    public JSONObject createPayout(
            String fundAccountId,
            long amountPaise,
            String mode,
            String referenceId
    ) throws Exception {

        requirePayoutConfiguration();
        requireText(
                fundAccountId,
                "Razorpay fund-account ID"
        );
        requireText(mode, "Payout mode");
        requireText(referenceId, "Payout reference ID");

        if (amountPaise <= 0) {
            throw new IllegalArgumentException(
                    "Payout amount must be greater than zero"
            );
        }

        String stableReference =
                referenceId.trim();

        if (stableReference.length() < 4
                || stableReference.length() > 36) {

            throw new IllegalArgumentException(
                    "Payout reference ID must contain 4 to 36 characters"
            );
        }

        JSONObject body = new JSONObject()
                .put(
                        "account_number",
                        sourceAccountNumber.trim()
                )
                .put(
                        "fund_account_id",
                        fundAccountId.trim()
                )
                .put("amount", amountPaise)
                .put("currency", "INR")
                .put("mode", mode.trim().toUpperCase())
                .put("purpose", "payout")
                .put("queue_if_low_balance", true)
                .put("reference_id", stableReference)
                .put(
                        "narration",
                        "SoCreate Creator Payout"
                );

        return post(
                "/payouts",
                body,
                stableReference
        );
    }

    /**
     * Fetches the latest status of an already-created payout.
     *
     * This must be used when CreatorEarning.razorpayPayoutId is populated.
     * Calling createPayout again is unnecessary and could complicate retries.
     */
    public JSONObject getPayout(
            String payoutId
    ) throws Exception {

        requireApiCredentials();
        requireText(
                payoutId,
                "Razorpay payout ID"
        );

        return get(
                "/payouts/"
                        + encodePathSegment(payoutId.trim())
        );
    }

    // ── HTTP methods ─────────────────────────────────────────────────────────

    private JSONObject get(
            String path
    ) throws Exception {

        HttpRequest request = baseRequest(path)
                .GET()
                .build();

        return execute(request);
    }

    private JSONObject post(
            String path,
            JSONObject body,
            String idempotencyKey
    ) throws Exception {

        HttpRequest.Builder builder = baseRequest(path)
                .POST(
                        HttpRequest.BodyPublishers.ofString(
                                body.toString(),
                                StandardCharsets.UTF_8
                        )
                );

        if (notBlank(idempotencyKey)) {
            builder.header(
                    "X-Payout-Idempotency",
                    idempotencyKey.trim()
            );
        }

        return execute(builder.build());
    }

    private JSONObject patch(
            String path,
            JSONObject body
    ) throws Exception {

        HttpRequest request = baseRequest(path)
                .method(
                        "PATCH",
                        HttpRequest.BodyPublishers.ofString(
                                body.toString(),
                                StandardCharsets.UTF_8
                        )
                )
                .build();

        return execute(request);
    }

    private HttpRequest.Builder baseRequest(
            String path
    ) {
        return HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + path))
                .timeout(REQUEST_TIMEOUT)
                .header(
                        "Authorization",
                        basicAuth()
                )
                .header(
                        "Content-Type",
                        "application/json"
                )
                .header(
                        "Accept",
                        "application/json"
                );
    }

    private JSONObject execute(
            HttpRequest request
    ) throws Exception {

        HttpResponse<String> response = http.send(
                request,
                HttpResponse.BodyHandlers.ofString()
        );

        String responseBody =
                response.body() != null
                        ? response.body()
                        : "";

        JSONObject json =
                parseJsonResponse(responseBody);

        if (response.statusCode() >= 200
                && response.statusCode() < 300) {

            return json;
        }

        String description =
                extractErrorDescription(
                        json,
                        responseBody,
                        response.statusCode()
                );

        throw new RazorpayXException(
                response.statusCode(),
                description
        );
    }

    private JSONObject parseJsonResponse(
            String responseBody
    ) {
        if (!notBlank(responseBody)) {
            return new JSONObject();
        }

        try {
            return new JSONObject(responseBody);
        } catch (Exception exception) {
            return new JSONObject()
                    .put("raw_response", responseBody);
        }
    }

    private String extractErrorDescription(
            JSONObject json,
            String responseBody,
            int statusCode
    ) {
        if (json.has("error")
                && json.opt("error")
                instanceof JSONObject error) {

            String description =
                    error.optString("description", null);

            if (notBlank(description)) {
                return description;
            }

            String reason =
                    error.optString("reason", null);

            if (notBlank(reason)) {
                return reason;
            }

            String code =
                    error.optString("code", null);

            if (notBlank(code)) {
                return code;
            }
        }

        String rawResponse =
                json.optString("raw_response", null);

        if (notBlank(rawResponse)) {
            return rawResponse;
        }

        if (notBlank(responseBody)) {
            return responseBody;
        }

        return "RazorpayX request failed with HTTP status "
                + statusCode;
    }

    // ── Validation/helpers ───────────────────────────────────────────────────

    private String extractFundAccountId(
            JSONObject response
    ) {
        String fundAccountId =
                response.optString("id", null);

        if (!notBlank(fundAccountId)) {
            throw new IllegalStateException(
                    "Razorpay did not return a fund-account ID"
            );
        }

        return fundAccountId;
    }

    private void requireApiCredentials() {
        if (!hasApiCredentials()) {
            throw new IllegalStateException(
                    "Razorpay API credentials are not configured"
            );
        }
    }

    private void requirePayoutConfiguration() {
        if (!isConfigured()) {
            throw new IllegalStateException(
                    "RazorpayX payout configuration is incomplete"
            );
        }
    }

    private void requireText(
            String value,
            String fieldName
    ) {
        if (!notBlank(value)) {
            throw new IllegalArgumentException(
                    fieldName + " is required"
            );
        }
    }

    private String basicAuth() {
        String raw =
                keyId + ":" + keySecret;

        return "Basic "
                + Base64.getEncoder()
                .encodeToString(
                        raw.getBytes(StandardCharsets.UTF_8)
                );
    }

    private static String encodePathSegment(
            String value
    ) {
        return URLEncoder.encode(
                value,
                StandardCharsets.UTF_8
        );
    }

    private static boolean notBlank(
            String value
    ) {
        return value != null
                && !value.isBlank();
    }

    public static class RazorpayXException
            extends RuntimeException {

        private final int status;

        public RazorpayXException(
                int status,
                String message
        ) {
            super(message);
            this.status = status;
        }

        public int getStatus() {
            return status;
        }
    }
}