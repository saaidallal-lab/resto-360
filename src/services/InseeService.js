// Realistic Mock Data for Median Income in Paris by Arrondissement (ZipCode)
// Paris Median average is ~ 29000 € / year 
const PARIS_MEDIAN_INCOME = 29000;

const medianIncomeByZip = {
    '75001': 35000,
    '75002': 33000,
    '75003': 34000,
    '75004': 36000,
    '75005': 38000,
    '75006': 45000,
    '75007': 48000,
    '75008': 44000,
    '75009': 34000,
    '75010': 27000,
    '75011': 28000,
    '75012': 29500,
    '75013': 28000,
    '75014': 31000,
    '75015': 34000,
    '75016': 46000,
    '75017': 35000,
    '75018': 24000,
    '75019': 22000,
    '75020': 23000
};

export const getPurchasingPower = async (zipCode) => {
    // Return approximate median income for the zipCode
    // Detailed mapping per Paris arrondissement logic to replace raw mock
    const localIncome = medianIncomeByZip[zipCode] || PARIS_MEDIAN_INCOME;

    // Evaluate against Paris average using tiers
    const thresholdHigh = PARIS_MEDIAN_INCOME * 1.15; // 33,350
    const thresholdAverage = PARIS_MEDIAN_INCOME; // 29,000
    const thresholdLow = PARIS_MEDIAN_INCOME * 0.85; // 24,650

    let score = 0;

    if (localIncome >= thresholdHigh) {
        score = 20; // Quartier aisé
    } else if (localIncome >= thresholdAverage) {
        score = 15; // Quartier moyen supérieur
    } else if (localIncome >= thresholdLow) {
        score = 10; // Quartier populaire
    } else {
        score = 5; // Très populaire
    }

    return {
        localIncome,
        parisAverage: PARIS_MEDIAN_INCOME,
        score // max 20
    };
};
