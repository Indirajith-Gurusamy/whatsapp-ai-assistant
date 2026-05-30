/**
 * Country, State/Region, and Postal Code data for dynamic address fields.
 */

export interface Country {
    code: string;
    name: string;
    phoneCode: string;
    postalCodePattern?: RegExp;
    postalCodeExample?: string;
}

export interface StateRegion {
    code: string;
    name: string;
    postalCodePattern?: RegExp;
    postalCodeExample?: string;
}

// ─── Countries ───────────────────────────────────────────────
export const countries: Country[] = [
    { code: 'US', name: 'United States', phoneCode: '+1', postalCodePattern: /^\d{5}(-\d{4})?$/, postalCodeExample: '12345' },
    { code: 'IN', name: 'India', phoneCode: '+91', postalCodePattern: /^\d{6}$/, postalCodeExample: '600001' },
    { code: 'GB', name: 'United Kingdom', phoneCode: '+44', postalCodePattern: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, postalCodeExample: 'SW1A 1AA' },
    { code: 'CA', name: 'Canada', phoneCode: '+1', postalCodePattern: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, postalCodeExample: 'K1A 0B1' },
    { code: 'AU', name: 'Australia', phoneCode: '+61', postalCodePattern: /^\d{4}$/, postalCodeExample: '2000' },
    { code: 'DE', name: 'Germany', phoneCode: '+49', postalCodePattern: /^\d{5}$/, postalCodeExample: '10115' },
    { code: 'FR', name: 'France', phoneCode: '+33', postalCodePattern: /^\d{5}$/, postalCodeExample: '75001' },
    { code: 'JP', name: 'Japan', phoneCode: '+81', postalCodePattern: /^\d{3}-?\d{4}$/, postalCodeExample: '100-0001' },
    { code: 'BR', name: 'Brazil', phoneCode: '+55', postalCodePattern: /^\d{5}-?\d{3}$/, postalCodeExample: '01001-000' },
    { code: 'MX', name: 'Mexico', phoneCode: '+52', postalCodePattern: /^\d{5}$/, postalCodeExample: '06600' },
    { code: 'AE', name: 'United Arab Emirates', phoneCode: '+971', postalCodePattern: /^.+$/, postalCodeExample: '' },
    { code: 'SA', name: 'Saudi Arabia', phoneCode: '+966', postalCodePattern: /^\d{5}$/, postalCodeExample: '11564' },
    { code: 'SG', name: 'Singapore', phoneCode: '+65', postalCodePattern: /^\d{6}$/, postalCodeExample: '018956' },
    { code: 'ZA', name: 'South Africa', phoneCode: '+27', postalCodePattern: /^\d{4}$/, postalCodeExample: '0001' },
    { code: 'NZ', name: 'New Zealand', phoneCode: '+64', postalCodePattern: /^\d{4}$/, postalCodeExample: '6011' },
    { code: 'IT', name: 'Italy', phoneCode: '+39', postalCodePattern: /^\d{5}$/, postalCodeExample: '00100' },
    { code: 'ES', name: 'Spain', phoneCode: '+34', postalCodePattern: /^\d{5}$/, postalCodeExample: '28001' },
    { code: 'NL', name: 'Netherlands', phoneCode: '+31', postalCodePattern: /^\d{4}\s?[A-Z]{2}$/i, postalCodeExample: '1012 AB' },
    { code: 'SE', name: 'Sweden', phoneCode: '+46', postalCodePattern: /^\d{3}\s?\d{2}$/, postalCodeExample: '111 22' },
    { code: 'CH', name: 'Switzerland', phoneCode: '+41', postalCodePattern: /^\d{4}$/, postalCodeExample: '3000' },
    { code: 'KR', name: 'South Korea', phoneCode: '+82', postalCodePattern: /^\d{5}$/, postalCodeExample: '04524' },
    { code: 'PH', name: 'Philippines', phoneCode: '+63', postalCodePattern: /^\d{4}$/, postalCodeExample: '1000' },
    { code: 'MY', name: 'Malaysia', phoneCode: '+60', postalCodePattern: /^\d{5}$/, postalCodeExample: '50000' },
    { code: 'NG', name: 'Nigeria', phoneCode: '+234', postalCodePattern: /^\d{6}$/, postalCodeExample: '100001' },
    { code: 'KE', name: 'Kenya', phoneCode: '+254', postalCodePattern: /^\d{5}$/, postalCodeExample: '00100' },
];

// ─── States / Regions ────────────────────────────────────────
const statesByCountry: Record<string, StateRegion[]> = {
    US: [
        { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
        { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
        { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
        { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
        { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
        { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
        { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
        { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
        { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
        { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
        { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
        { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
        { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
        { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
        { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
        { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
        { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'District of Columbia' },
    ],
    IN: [
        { code: 'AN', name: 'Andaman and Nicobar Islands' }, { code: 'AP', name: 'Andhra Pradesh' },
        { code: 'AR', name: 'Arunachal Pradesh' }, { code: 'AS', name: 'Assam' }, { code: 'BR', name: 'Bihar' },
        { code: 'CH', name: 'Chandigarh' }, { code: 'CT', name: 'Chhattisgarh' },
        { code: 'DN', name: 'Dadra and Nagar Haveli and Daman and Diu' }, { code: 'DL', name: 'Delhi' },
        { code: 'GA', name: 'Goa' }, { code: 'GJ', name: 'Gujarat' }, { code: 'HR', name: 'Haryana' },
        { code: 'HP', name: 'Himachal Pradesh' }, { code: 'JK', name: 'Jammu and Kashmir' },
        { code: 'JH', name: 'Jharkhand' }, { code: 'KA', name: 'Karnataka' }, { code: 'KL', name: 'Kerala' },
        { code: 'LA', name: 'Ladakh' }, { code: 'LD', name: 'Lakshadweep' }, { code: 'MP', name: 'Madhya Pradesh' },
        { code: 'MH', name: 'Maharashtra' }, { code: 'MN', name: 'Manipur' }, { code: 'ML', name: 'Meghalaya' },
        { code: 'MZ', name: 'Mizoram' }, { code: 'NL', name: 'Nagaland' }, { code: 'OR', name: 'Odisha' },
        { code: 'PY', name: 'Puducherry' }, { code: 'PB', name: 'Punjab' }, { code: 'RJ', name: 'Rajasthan' },
        { code: 'SK', name: 'Sikkim' }, { code: 'TN', name: 'Tamil Nadu' }, { code: 'TG', name: 'Telangana' },
        { code: 'TR', name: 'Tripura' }, { code: 'UP', name: 'Uttar Pradesh' }, { code: 'UT', name: 'Uttarakhand' },
        { code: 'WB', name: 'West Bengal' },
    ],
    GB: [
        { code: 'ENG', name: 'England' }, { code: 'SCT', name: 'Scotland' },
        { code: 'WLS', name: 'Wales' }, { code: 'NIR', name: 'Northern Ireland' },
    ],
    CA: [
        { code: 'AB', name: 'Alberta' }, { code: 'BC', name: 'British Columbia' },
        { code: 'MB', name: 'Manitoba' }, { code: 'NB', name: 'New Brunswick' },
        { code: 'NL', name: 'Newfoundland and Labrador' }, { code: 'NS', name: 'Nova Scotia' },
        { code: 'NT', name: 'Northwest Territories' }, { code: 'NU', name: 'Nunavut' },
        { code: 'ON', name: 'Ontario' }, { code: 'PE', name: 'Prince Edward Island' },
        { code: 'QC', name: 'Quebec' }, { code: 'SK', name: 'Saskatchewan' }, { code: 'YT', name: 'Yukon' },
    ],
    AU: [
        { code: 'ACT', name: 'Australian Capital Territory' }, { code: 'NSW', name: 'New South Wales' },
        { code: 'NT', name: 'Northern Territory' }, { code: 'QLD', name: 'Queensland' },
        { code: 'SA', name: 'South Australia' }, { code: 'TAS', name: 'Tasmania' },
        { code: 'VIC', name: 'Victoria' }, { code: 'WA', name: 'Western Australia' },
    ],
    DE: [
        { code: 'BW', name: 'Baden-Württemberg' }, { code: 'BY', name: 'Bavaria' },
        { code: 'BE', name: 'Berlin' }, { code: 'BB', name: 'Brandenburg' },
        { code: 'HB', name: 'Bremen' }, { code: 'HH', name: 'Hamburg' },
        { code: 'HE', name: 'Hesse' }, { code: 'NI', name: 'Lower Saxony' },
        { code: 'MV', name: 'Mecklenburg-Vorpommern' }, { code: 'NW', name: 'North Rhine-Westphalia' },
        { code: 'RP', name: 'Rhineland-Palatinate' }, { code: 'SL', name: 'Saarland' },
        { code: 'SN', name: 'Saxony' }, { code: 'ST', name: 'Saxony-Anhalt' },
        { code: 'SH', name: 'Schleswig-Holstein' }, { code: 'TH', name: 'Thuringia' },
    ],
    AE: [
        { code: 'AZ', name: 'Abu Dhabi' }, { code: 'AJ', name: 'Ajman' },
        { code: 'DU', name: 'Dubai' }, { code: 'FU', name: 'Fujairah' },
        { code: 'RK', name: 'Ras al-Khaimah' }, { code: 'SH', name: 'Sharjah' },
        { code: 'UQ', name: 'Umm al-Quwain' },
    ],
    SA: [
        { code: 'RI', name: 'Riyadh' }, { code: 'MK', name: 'Makkah' },
        { code: 'MD', name: 'Madinah' }, { code: 'EP', name: 'Eastern Province' },
        { code: 'AS', name: 'Asir' }, { code: 'TB', name: 'Tabuk' },
        { code: 'HA', name: 'Hail' }, { code: 'NB', name: 'Northern Borders' },
        { code: 'JZ', name: 'Jazan' }, { code: 'NJ', name: 'Najran' },
        { code: 'BA', name: 'Al Bahah' }, { code: 'JF', name: 'Al Jawf' },
        { code: 'QS', name: 'Qassim' },
    ],
    BR: [
        { code: 'AC', name: 'Acre' }, { code: 'AL', name: 'Alagoas' }, { code: 'AP', name: 'Amapá' },
        { code: 'AM', name: 'Amazonas' }, { code: 'BA', name: 'Bahia' }, { code: 'CE', name: 'Ceará' },
        { code: 'DF', name: 'Distrito Federal' }, { code: 'ES', name: 'Espírito Santo' },
        { code: 'GO', name: 'Goiás' }, { code: 'MA', name: 'Maranhão' },
        { code: 'MT', name: 'Mato Grosso' }, { code: 'MS', name: 'Mato Grosso do Sul' },
        { code: 'MG', name: 'Minas Gerais' }, { code: 'PA', name: 'Pará' },
        { code: 'PB', name: 'Paraíba' }, { code: 'PR', name: 'Paraná' },
        { code: 'PE', name: 'Pernambuco' }, { code: 'PI', name: 'Piauí' },
        { code: 'RJ', name: 'Rio de Janeiro' }, { code: 'RN', name: 'Rio Grande do Norte' },
        { code: 'RS', name: 'Rio Grande do Sul' }, { code: 'RO', name: 'Rondônia' },
        { code: 'RR', name: 'Roraima' }, { code: 'SC', name: 'Santa Catarina' },
        { code: 'SP', name: 'São Paulo' }, { code: 'SE', name: 'Sergipe' },
        { code: 'TO', name: 'Tocantins' },
    ],
};

// ─── Helpers ─────────────────────────────────────────────────

export function getStatesForCountry(countryCode: string): StateRegion[] {
    return statesByCountry[countryCode] || [];
}

export function getCountryByCode(code: string): Country | undefined {
    return countries.find(c => c.code === code);
}

export function getCountryByName(name: string): Country | undefined {
    return countries.find(c => c.name.toLowerCase() === name.toLowerCase());
}

export function getStateByName(countryCode: string, stateName: string): StateRegion | undefined {
    const states = getStatesForCountry(countryCode);
    return states.find(s => s.name.toLowerCase() === stateName.toLowerCase());
}

/**
 * Validate postal code against country-level pattern.
 * Returns error message or empty string if valid.
 */
export function validatePostalCode(postalCode: string, countryCode: string): string {
    if (!postalCode.trim()) return '';

    const country = getCountryByCode(countryCode);
    if (!country) return '';

    if (country.postalCodePattern && !country.postalCodePattern.test(postalCode.trim())) {
        return `Invalid postal code for ${country.name}${country.postalCodeExample ? ` (e.g. ${country.postalCodeExample})` : ''}`;
    }

    return '';
}

/**
 * Get options formatted for the SearchableSelect component.
 */
export function getCountryOptions() {
    return countries.map(c => ({
        value: c.name,
        label: c.name,
        code: c.code,
    }));
}

export function getStateOptions(countryCode: string) {
    return getStatesForCountry(countryCode).map(s => ({
        value: s.name,
        label: s.name,
    }));
}
