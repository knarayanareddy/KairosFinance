import type { TaxCategory, VatRate } from '@bunqsy/shared';

export interface CategoryRule {
  pattern: RegExp;
  category: TaxCategory;
  vatRate: VatRate;
  isBusinessExpense: boolean;
  deductibilityPct: number;
  confidence: number;
}

// Priority order: first match wins.
// Covers ~200 known merchants/patterns for NL market.
export const CATEGORY_RULES: CategoryRule[] = [

  // ─── Income ───────────────────────────────────────────────────────────────
  { pattern: /salar|loon|wage|payroll|werkgever|salary/i,           category: 'INCOME_SALARY',      vatRate: 'EXEMPT', isBusinessExpense: false, deductibilityPct: 0,   confidence: 0.97 },
  { pattern: /dividend/i,                                           category: 'INCOME_DIVIDEND',    vatRate: 'EXEMPT', isBusinessExpense: false, deductibilityPct: 0,   confidence: 0.97 },
  { pattern: /interest|rente/i,                                     category: 'INCOME_INTEREST',    vatRate: 'EXEMPT', isBusinessExpense: false, deductibilityPct: 0,   confidence: 0.95 },
  { pattern: /refund|terugbetaling|restitut/i,                      category: 'INCOME_OTHER',       vatRate: 'EXEMPT', isBusinessExpense: false, deductibilityPct: 0,   confidence: 0.80 },

  // ─── Tax payments ─────────────────────────────────────────────────────────
  { pattern: /belastingdienst|tax.*authority|hmrc|irs/i,            category: 'TAX_PAYMENT',        vatRate: 'EXEMPT', isBusinessExpense: false, deductibilityPct: 0,   confidence: 0.98 },
  { pattern: /btw.*aangifte|vat.*return|tax.*refund/i,              category: 'TAX_REFUND',         vatRate: 'EXEMPT', isBusinessExpense: false, deductibilityPct: 0,   confidence: 0.95 },

  // ─── Internal transfers / savings ─────────────────────────────────────────
  { pattern: /own.*account|eigen.*rekening|intern.*overboek|savings.*transfer|spaar/i, category: 'TRANSFER_SAVINGS', vatRate: 'EXEMPT', isBusinessExpense: false, deductibilityPct: 0, confidence: 0.97 },
  { pattern: /between.*accounts|internal.*transfer|overboek/i,     category: 'TRANSFER_INTERNAL',  vatRate: 'EXEMPT', isBusinessExpense: false, deductibilityPct: 0,   confidence: 0.90 },

  // ─── Software / SaaS ─────────────────────────────────────────────────────
  { pattern: /github|gitlab/i,                                       category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.98 },
  { pattern: /amazon web services|aws\b/i,                           category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.98 },
  { pattern: /google cloud|gcloud|google.*workspace/i,               category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.98 },
  { pattern: /microsoft azure|azure\b/i,                             category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.98 },
  { pattern: /anthropic|claude\.ai/i,                                category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.98 },
  { pattern: /openai/i,                                              category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.98 },
  { pattern: /slack\b/i,                                             category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.98 },
  { pattern: /figma\b/i,                                             category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.98 },
  { pattern: /notion\b/i,                                            category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.97 },
  { pattern: /linear\b/i,                                            category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.97 },
  { pattern: /jira|atlassian|confluence/i,                           category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.97 },
  { pattern: /vercel\b/i,                                            category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.98 },
  { pattern: /netlify\b/i,                                           category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.97 },
  { pattern: /cloudflare\b/i,                                        category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.97 },
  { pattern: /digitalocean|linode|vultr|hetzner/i,                   category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.97 },
  { pattern: /1password|lastpass|bitwarden/i,                        category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.97 },
  { pattern: /datadog|sentry\b|new relic|pagerduty/i,                category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.97 },
  { pattern: /hubspot|salesforce|mailchimp|sendgrid/i,               category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.97 },
  { pattern: /zapier|make\.com|n8n/i,                                category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.97 },
  { pattern: /adobe creative|adobe cc|adobe\.com/i,                  category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.97 },
  { pattern: /sketch\b|invision|zeplin/i,                            category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.97 },
  { pattern: /docker\b|kubernetes|helm/i,                            category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.96 },
  { pattern: /jetbrains|intellij|pycharm|webstorm/i,                 category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.97 },
  { pattern: /zoom\b/i,                                              category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.96 },
  { pattern: /dropbox|box\.com|google drive/i,                       category: 'BIZ_SOFTWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.95 },

  // ─── Hardware / Equipment ─────────────────────────────────────────────────
  { pattern: /apple store|apple\.com|iphone|macbook|ipad/i,          category: 'BIZ_HARDWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.90 },
  { pattern: /coolblue|bol\.com.*electr|mediamarkt|saturn\b/i,       category: 'BIZ_HARDWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.88 },
  { pattern: /dell\b|lenovo|hp.*laptop|acer\b|asus\b/i,              category: 'BIZ_HARDWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.92 },
  { pattern: /keyboard|mouse|monitor|webcam|headset|microphone/i,    category: 'BIZ_HARDWARE',       vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.88 },

  // ─── Office supplies ──────────────────────────────────────────────────────
  { pattern: /staples|office depot|hema.*kantoor|bol\.com.*kantoor/i, category: 'BIZ_OFFICE',        vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.90 },
  { pattern: /pen|paper|notebook|printer|ink cartridge|toner/i,      category: 'BIZ_OFFICE',        vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.85 },
  { pattern: /coworking|werkplek|flex desk|work.*space/i,             category: 'BIZ_OFFICE',        vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.92 },
  { pattern: /WeWork|Seats2Meet|Regus|IWG\b/i,                       category: 'BIZ_OFFICE',        vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.95 },

  // ─── Professional services ────────────────────────────────────────────────
  { pattern: /accountant|boekhouder|belastingadviseur|tax advisor/i,  category: 'BIZ_PROFESSIONAL_SERVICES', vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.95 },
  { pattern: /notaris|notary|legal|advocaat|lawyer/i,                 category: 'BIZ_PROFESSIONAL_SERVICES', vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.95 },
  { pattern: /kvk|chamber.*commerce|kamer.*koophandel/i,              category: 'BIZ_PROFESSIONAL_SERVICES', vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.97 },
  { pattern: /freelancer|consultant|contractor|opdracht/i,            category: 'BIZ_PROFESSIONAL_SERVICES', vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.85 },

  // ─── Advertising & Marketing ──────────────────────────────────────────────
  { pattern: /google ads|google.*adwords/i,                           category: 'BIZ_ADVERTISING',   vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.98 },
  { pattern: /facebook ads|instagram ads|meta ads|meta.*payment/i,    category: 'BIZ_ADVERTISING',   vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.97 },
  { pattern: /linkedin.*ads|twitter.*ads|tiktok.*ads/i,               category: 'BIZ_ADVERTISING',   vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.97 },
  { pattern: /drukwerk|printing|flyers|brochure/i,                    category: 'BIZ_ADVERTISING',   vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.88 },

  // ─── Travel ───────────────────────────────────────────────────────────────
  { pattern: /klm|transavia|easyjet|ryanair|lufthansa|british airways/i, category: 'BIZ_TRAVEL',    vatRate: '0',  isBusinessExpense: true, deductibilityPct: 100, confidence: 0.90 },
  { pattern: /booking\.com|airbnb|hotels\.com|expedia/i,              category: 'BIZ_TRAVEL',        vatRate: '9',  isBusinessExpense: true, deductibilityPct: 100, confidence: 0.85 },
  { pattern: /uber\b|bolt\b|taxi|cabify/i,                            category: 'BIZ_TRAVEL',        vatRate: '9',  isBusinessExpense: true, deductibilityPct: 100, confidence: 0.85 },
  { pattern: /ns\b|nederlandse spoorwegen|train|intercity|sprinter/i, category: 'BIZ_TRAVEL',        vatRate: '9',  isBusinessExpense: true, deductibilityPct: 100, confidence: 0.90 },
  { pattern: /parkeren|parking|p\+r\b/i,                              category: 'BIZ_TRAVEL',        vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.85 },
  { pattern: /tankstation|shell\b|bp\b|total\b|esso\b|brandstof|petrol/i, category: 'BIZ_TRAVEL',   vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.87 },

  // ─── Meals & entertainment ────────────────────────────────────────────────
  { pattern: /restaurant|cafe|bistro|brasserie|eetcafe/i,             category: 'BIZ_MEALS',         vatRate: '9',  isBusinessExpense: true, deductibilityPct: 80,  confidence: 0.90 },
  { pattern: /thuisbezorgd|deliveroo|uber eats|just eat/i,            category: 'BIZ_MEALS',         vatRate: '9',  isBusinessExpense: true, deductibilityPct: 80,  confidence: 0.90 },
  { pattern: /dinner|lunch|breakfast|brunch/i,                        category: 'BIZ_MEALS',         vatRate: '9',  isBusinessExpense: true, deductibilityPct: 80,  confidence: 0.82 },
  { pattern: /mcdonalds|burger king|kfc|subway|dominos|pizza hut/i,   category: 'BIZ_MEALS',         vatRate: '9',  isBusinessExpense: true, deductibilityPct: 80,  confidence: 0.88 },

  // ─── Phone & Internet ─────────────────────────────────────────────────────
  { pattern: /kpn\b|t-mobile|vodafone|tele2|xs4all|ziggo|odido/i,     category: 'BIZ_PHONE_INTERNET',vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.95 },
  { pattern: /internet.*abonnement|phone.*subscription|mobiel.*abonnement/i, category: 'BIZ_PHONE_INTERNET', vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.90 },

  // ─── Education / Training ─────────────────────────────────────────────────
  { pattern: /udemy|coursera|pluralsight|linkedin learning|skillshare/i, category: 'BIZ_EDUCATION',  vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.97 },
  { pattern: /boekhandel|bol\.com.*boek|standaard.*boekhandel/i,      category: 'BIZ_EDUCATION',     vatRate: '9',  isBusinessExpense: true, deductibilityPct: 100, confidence: 0.85 },
  { pattern: /training|cursus|workshop|seminar|conference|congres/i,  category: 'BIZ_EDUCATION',     vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.85 },

  // ─── Insurance ────────────────────────────────────────────────────────────
  { pattern: /aegon|nationale nederlanden|centraal beheer|interpolis|nn groep/i, category: 'BIZ_INSURANCE', vatRate: 'EXEMPT', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.95 },
  { pattern: /verzekering|insurance|assurance/i,                      category: 'BIZ_INSURANCE',     vatRate: 'EXEMPT', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.88 },

  // ─── Banking fees ─────────────────────────────────────────────────────────
  { pattern: /bunq\b|ing\b|rabobank|abn amro|sns bank/i,              category: 'BIZ_BANK_FEES',     vatRate: 'EXEMPT', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.75 },
  { pattern: /bank.*fee|account.*fee|payment.*processing|stripe\b|mollie\b|adyen\b/i, category: 'BIZ_BANK_FEES', vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.92 },
  { pattern: /paypal.*fee|transaction.*fee|processing.*fee/i,         category: 'BIZ_BANK_FEES',     vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.90 },

  // ─── Business subscriptions ───────────────────────────────────────────────
  { pattern: /chambers.*commerce|kvk.*jaarlijks/i,                    category: 'BIZ_SUBSCRIPTIONS', vatRate: 'EXEMPT', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.95 },
  { pattern: /domain.*renewal|domein.*verleng|namecheap|godaddy\b/i,  category: 'BIZ_SUBSCRIPTIONS', vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.95 },
  { pattern: /newsletter|substack|beehiiv/i,                          category: 'BIZ_SUBSCRIPTIONS', vatRate: '21', isBusinessExpense: true, deductibilityPct: 100, confidence: 0.90 },

  // ─── Personal: groceries ──────────────────────────────────────────────────
  { pattern: /albert heijn|ah\b|jumbo\b|lidl\b|aldi\b|plus supermarkt|dirk.*supermarkt/i, category: 'PERSONAL_GROCERIES', vatRate: '9', isBusinessExpense: false, deductibilityPct: 0, confidence: 0.97 },
  { pattern: /supermarkt|supermarket|boodschappen|grocery/i,          category: 'PERSONAL_GROCERIES',vatRate: '9',  isBusinessExpense: false, deductibilityPct: 0,   confidence: 0.88 },

  // ─── Personal: dining ─────────────────────────────────────────────────────
  { pattern: /starbucks|costa coffee|dunkin/i,                        category: 'PERSONAL_DINING',   vatRate: '9',  isBusinessExpense: false, deductibilityPct: 0,   confidence: 0.92 },

  // ─── Personal: transport ─────────────────────────────────────────────────
  { pattern: /ov-chipkaart|9292|gvb\b|ret\b|htm\b|connexxion/i,       category: 'PERSONAL_TRANSPORT',vatRate: '9',  isBusinessExpense: false, deductibilityPct: 0,   confidence: 0.95 },
  { pattern: /swapfiets|lease.*fiets|bike.*rental/i,                   category: 'PERSONAL_TRANSPORT',vatRate: '21', isBusinessExpense: false, deductibilityPct: 0,   confidence: 0.90 },

  // ─── Personal: health ─────────────────────────────────────────────────────
  { pattern: /huisarts|apotheek|pharmacy|dokter|dentist|tandarts|fysiotherap/i, category: 'PERSONAL_HEALTH', vatRate: 'EXEMPT', isBusinessExpense: false, deductibilityPct: 0, confidence: 0.95 },
  { pattern: /zorgverzekering|health.*insurance|zilveren kruis|menzis|vgz\b/i,  category: 'PERSONAL_HEALTH', vatRate: 'EXEMPT', isBusinessExpense: false, deductibilityPct: 0, confidence: 0.97 },
  { pattern: /fitness|gym\b|sportschool|basic-fit|virgin active/i,     category: 'PERSONAL_HEALTH',   vatRate: '21', isBusinessExpense: false, deductibilityPct: 0,   confidence: 0.92 },

  // ─── Personal: housing ────────────────────────────────────────────────────
  { pattern: /huur|rent|hypotheek|mortgage/i,                         category: 'PERSONAL_HOUSING',  vatRate: 'EXEMPT', isBusinessExpense: false, deductibilityPct: 0, confidence: 0.88 },
  { pattern: /nuon|vattenfall|eneco|greenchoice|essent|energie/i,      category: 'PERSONAL_UTILITIES',vatRate: '21', isBusinessExpense: false, deductibilityPct: 0,   confidence: 0.95 },
  { pattern: /waterleidingbedrijf|water.*company|waternet/i,            category: 'PERSONAL_UTILITIES',vatRate: '9',  isBusinessExpense: false, deductibilityPct: 0,   confidence: 0.95 },

  // ─── Personal: entertainment ──────────────────────────────────────────────
  { pattern: /netflix\b|spotify\b|apple.*music|disney\+|hbo max|videoland/i, category: 'PERSONAL_ENTERTAINMENT', vatRate: '21', isBusinessExpense: false, deductibilityPct: 0, confidence: 0.98 },
  { pattern: /bioscoop|cinema|pathé|pathe|vue.*cinema/i,              category: 'PERSONAL_ENTERTAINMENT', vatRate: '9', isBusinessExpense: false, deductibilityPct: 0, confidence: 0.95 },
  { pattern: /steam\b|playstation|xbox|nintendo/i,                    category: 'PERSONAL_ENTERTAINMENT', vatRate: '21', isBusinessExpense: false, deductibilityPct: 0, confidence: 0.95 },

  // ─── Personal: clothing ───────────────────────────────────────────────────
  { pattern: /zara\b|h&m\b|primark|uniqlo|only\b|vero moda/i,         category: 'PERSONAL_CLOTHING', vatRate: '21', isBusinessExpense: false, deductibilityPct: 0,   confidence: 0.95 },

  // ─── Personal: education ──────────────────────────────────────────────────
  { pattern: /duolingo|babbel|rosetta stone/i,                        category: 'PERSONAL_EDUCATION',vatRate: '21', isBusinessExpense: false, deductibilityPct: 0,   confidence: 0.95 },
];

/** Find the first matching rule for a transaction. */
export function matchCategoryRules(
  counterpartyName: string,
  description: string,
): CategoryRule | null {
  const text = `${counterpartyName} ${description}`;
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(text)) return rule;
  }
  return null;
}
