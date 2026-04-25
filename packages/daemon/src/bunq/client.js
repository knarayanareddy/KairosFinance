import { signRequestBody } from './signing.js';
import { refreshSessionIfNeeded } from './auth.js';
import { MonetaryAccountBankSchema, MonetaryAccountListResponseSchema, PaymentSchema, PaymentListResponseSchema, CardSchema, CardListResponseSchema, ScheduledPaymentSchema, ScheduledPaymentListResponseSchema, SavingsGoalSchema, SavingsGoalListResponseSchema, } from '@bunqsy/shared';
function getBunqBaseUrl() {
    const env = process.env.BUNQ_ENV;
    if (env === 'production') {
        const url = process.env.BUNQ_PRODUCTION_URL;
        if (!url)
            throw new Error('BUNQ_PRODUCTION_URL is not set');
        return url;
    }
    const url = process.env.BUNQ_SANDBOX_URL;
    if (!url)
        throw new Error('BUNQ_SANDBOX_URL is not set');
    return url;
}
function extractAccountFromItem(item) {
    const wrapperKeys = [
        'MonetaryAccountBank',
        'MonetaryAccountSavings',
        'MonetaryAccountJoint',
    ];
    for (const key of wrapperKeys) {
        if (item !== null && typeof item === 'object' && key in item) {
            const account = MonetaryAccountBankSchema.parse(item[key]);
            return { ...account, _wrapperType: key };
        }
    }
    throw new Error('Unknown monetary account type in response');
}
function extractCardFromItem(item) {
    for (const key of ['CardDebit', 'CardCredit']) {
        if (item !== null && typeof item === 'object' && key in item) {
            return CardSchema.parse(item[key]);
        }
    }
    throw new Error('Unknown card type in response');
}
export class BunqClient {
    session;
    constructor(session) {
        this.session = session;
    }
    getSession() {
        return this.session;
    }
    async get(path, schema) {
        this.session = await refreshSessionIfNeeded(this.session);
        const baseUrl = getBunqBaseUrl();
        // bunq requires signing on all requests, including GETs — sign empty body
        const signature = signRequestBody('', this.session.keyPair.privateKeyPem);
        const res = await fetch(`${baseUrl}${path}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'BunqsyFinance/1.0',
                'X-Bunq-Client-Authentication': this.session.sessionToken,
                'X-Bunq-Client-Signature': signature,
            },
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(JSON.stringify({ phase: 'client', path, status: res.status, body }));
        }
        const raw = await res.json();
        const result = schema.safeParse(raw);
        if (!result.success) {
            throw new Error(JSON.stringify({ phase: 'client', error: 'bunq contract mismatch', path, issues: result.error.issues }));
        }
        return result.data;
    }
    async getAccounts() {
        const data = await this.get(`/user/${this.session.userId}/monetary-account`, MonetaryAccountListResponseSchema);
        return data.Response.map(extractAccountFromItem);
    }
    async getTransactions(accountId, count = 50, newerId) {
        let path = `/user/${this.session.userId}/monetary-account/${accountId}/payment?count=${count}`;
        if (newerId !== undefined) {
            path += `&newer_id=${newerId}`;
        }
        const data = await this.get(path, PaymentListResponseSchema);
        return data.Response.map((item) => PaymentSchema.parse(item['Payment']));
    }
    async getCards() {
        const data = await this.get(`/user/${this.session.userId}/card`, CardListResponseSchema);
        return data.Response.map(extractCardFromItem);
    }
    async getSavingsGoals(accountId) {
        try {
            const data = await this.get(`/user/${this.session.userId}/monetary-account/${accountId}/savings-goal`, SavingsGoalListResponseSchema);
            return data.Response.map((item) => SavingsGoalSchema.parse(item['SavingsGoal']));
        }
        catch {
            return []; // endpoint may not exist on all account types — fail silently
        }
    }
    async getScheduledPayments(accountId) {
        const data = await this.get(`/user/${this.session.userId}/monetary-account/${accountId}/schedule`, ScheduledPaymentListResponseSchema);
        return data.Response.map((item) => ScheduledPaymentSchema.parse(item['ScheduledPayment']));
    }
}
