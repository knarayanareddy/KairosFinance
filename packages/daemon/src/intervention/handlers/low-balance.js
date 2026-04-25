export async function run(verdict, _snapshot, _db) {
    const isRent = verdict.interventionType === 'RENT_CRITICAL'
        || verdict.interventionType === 'RENT_WARNING';
    const isCritical = verdict.interventionType === 'BALANCE_CRITICAL'
        || verdict.interventionType === 'RENT_CRITICAL';
    return {
        type: isRent ? 'RENT_WARNING' : 'LOW_BALANCE',
        modality: isCritical ? 'VOICE' : 'CARD',
        planId: null,
    };
}
