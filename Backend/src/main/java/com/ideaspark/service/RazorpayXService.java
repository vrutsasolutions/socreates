package com.ideaspark.service;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;

/**
 * Thin client for the RazorpayX Payouts API (test mode).
 *
 * The bundled razorpay-java SDK (1.4.8) only covers the Payment Gateway
 * (orders / payment verification — see {@link RazorpayService}); it does not
 * expose Contacts / Fund Accounts / Payouts. So we call the RazorpayX REST API
 * directly over HTTP with HTTP Basic auth (keyId:keySecret) — the SAME test
 * keys already used for payments (a RazorpayX account shares its API keys with
 * the Razorpay account).
 *
 * Payout flow (each creator, once details are saved, reuses the ids):
 *   1. POST /v1/contacts        → contactId       (the creator)
 *   2. POST /v1/fund_accounts   → fundAccountId   (their VPA or bank account)
 *   3. POST /v1/payouts         → payoutId        (money out of the source
 *                                                  RazorpayX virtual account)
 *
 * TEST MODE: no real money moves. Payouts to the RazorpayX test virtual
 * account are auto-processed. The source account number
 * ({@code razorpayx.account-number}) is the test-mode virtual account shown on
 * the RazorpayX dashboard (Account Details), e.g. 2323230000000000.
 */
@Service
public class RazorpayXService {

    private static final String BASE_URL = "https://api.razorpay.com/v1";

    // RazorpayX shares the Razorpay account's API keys.
    @Value("${razorpay.key-id:}")
    private String keyId;

    @Value("${razorpay.key-secret:}")
    private String keySecret;

    /** Source RazorpayX virtual account number the payout is debited from. */
    @Value("${razorpayx.account-number:}")
    private String sourceAccountNumber;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    /** Keys AND the source account number must all be present to pay out. */
    public boolean isConfigured() {
        return notBlank(keyId) && notBlank(keySecret) && notBlank(sourceAccountNumber);
    }

    // ── Public API ───────────────────────────────────────────────────────────

    /** Create a RazorpayX contact for a creator. Returns the contact id. */
    public String createContact(String name, String email) throws Exception {
        JSONObject body = new JSONObject()
                .put("name", name != null && !name.isBlank() ? name : "IdeaSpark Creator")
                .put("email", email)
                .put("type", "vendor");
        JSONObject res = post("/contacts", body, null);
        return res.getString("id");
    }

    /**
     * Create a UPI/VPA fund account for a contact. Returns the fund account id.
     * @param vpa e.g. "creator@okhdfcbank"
     */
    public String createVpaFundAccount(String contactId, String vpa) throws Exception {
        JSONObject body = new JSONObject()
                .put("contact_id", contactId)
                .put("account_type", "vpa")
                .put("vpa", new JSONObject().put("address", vpa));
        JSONObject res = post("/fund_accounts", body, null);
        return res.getString("id");
    }

    /**
     * Create a bank-account fund account for a contact. Returns the fund
     * account id. In test mode any well-formed IFSC / account number works.
     */
    public String createBankFundAccount(
            String contactId, String beneficiaryName, String ifsc, String accountNumber) throws Exception {
        JSONObject body = new JSONObject()
                .put("contact_id", contactId)
                .put("account_type", "bank_account")
                .put("bank_account", new JSONObject()
                        .put("name", beneficiaryName)
                        .put("ifsc", ifsc)
                        .put("account_number", accountNumber));
        JSONObject res = post("/fund_accounts", body, null);
        return res.getString("id");
    }

    /**
     * Create a payout to a fund account.
     *
     * @param fundAccountId  destination fund account (fa_...)
     * @param amountPaise    amount in paise
     * @param mode           "UPI" (for VPA) or "IMPS" (for bank_account)
     * @param referenceId    idempotency / reconciliation reference (unique per earning)
     * @return the parsed payout JSON (has "id" and "status")
     */
    public JSONObject createPayout(
            String fundAccountId, long amountPaise, String mode, String referenceId) throws Exception {
        JSONObject body = new JSONObject()
                .put("account_number", sourceAccountNumber)
                .put("fund_account_id", fundAccountId)
                .put("amount", amountPaise)
                .put("currency", "INR")
                .put("mode", mode)
                .put("purpose", "payout")
                .put("queue_if_low_balance", true)
                .put("reference_id", referenceId)
                .put("narration", "IdeaSpark Creator Payout");
        // Idempotency: replaying the same earning payout returns the original
        // payout instead of creating a duplicate.
        return post("/payouts", body, referenceId);
    }

    // ── HTTP plumbing ─────────────────────────────────────────────────────────

    private JSONObject post(String path, JSONObject body, String idempotencyKey) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + path))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", basicAuth())
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8));

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            builder.header("X-Payout-Idempotency", idempotencyKey);
        }

        HttpResponse<String> res = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        JSONObject json = res.body() != null && !res.body().isBlank()
                ? new JSONObject(res.body())
                : new JSONObject();

        if (res.statusCode() >= 200 && res.statusCode() < 300) {
            return json;
        }

        // Surface RazorpayX's own error description when present.
        String description = json.has("error")
                ? json.getJSONObject("error").optString("description", res.body())
                : res.body();
        throw new RazorpayXException(res.statusCode(), description);
    }

    private String basicAuth() {
        String raw = keyId + ":" + keySecret;
        return "Basic " + Base64.getEncoder()
                .encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    /** Carries the HTTP status + RazorpayX message so callers can map it to a response. */
    public static class RazorpayXException extends RuntimeException {
        private final int status;
        public RazorpayXException(int status, String message) {
            super(message);
            this.status = status;
        }
        public int getStatus() { return status; }
    }
}
