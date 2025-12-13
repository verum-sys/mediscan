/**
 * Dummy ICD-10 and SNOMED CT code mappings for demonstration purposes
 * In production, this should be replaced with proper medical terminology databases
 */

export interface ICDCode {
    code: string;
    description: string;
    category: string;
}

export interface SNOMEDCode {
    code: string;
    description: string;
    category: string;
}

export interface Classification {
    icd: ICDCode;
    snomed: SNOMEDCode;
    keywords: string[];
}

// Common ICD-10 codes
export const ICD_CODES: Record<string, ICDCode> = {
    // Respiratory
    'J00': { code: 'J00', description: 'Acute nasopharyngitis (common cold)', category: 'Respiratory' },
    'J18.9': { code: 'J18.9', description: 'Pneumonia, unspecified organism', category: 'Respiratory' },
    'J06.9': { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', category: 'Respiratory' },
    'J20.9': { code: 'J20.9', description: 'Acute bronchitis, unspecified', category: 'Respiratory' },
    'J45.9': { code: 'J45.9', description: 'Asthma, unspecified', category: 'Respiratory' },

    // Cardiovascular
    'I10': { code: 'I10', description: 'Essential (primary) hypertension', category: 'Cardiovascular' },
    'I21.9': { code: 'I21.9', description: 'Acute myocardial infarction, unspecified', category: 'Cardiovascular' },
    'I20.9': { code: 'I20.9', description: 'Angina pectoris, unspecified', category: 'Cardiovascular' },
    'I48.91': { code: 'I48.91', description: 'Unspecified atrial fibrillation', category: 'Cardiovascular' },

    // Gastrointestinal
    'K21.9': { code: 'K21.9', description: 'Gastro-esophageal reflux disease without esophagitis', category: 'Gastrointestinal' },
    'K29.7': { code: 'K29.7', description: 'Gastritis, unspecified', category: 'Gastrointestinal' },
    'K35.80': { code: 'K35.80', description: 'Unspecified acute appendicitis', category: 'Gastrointestinal' },
    'K59.00': { code: 'K59.00', description: 'Constipation, unspecified', category: 'Gastrointestinal' },
    'K52.9': { code: 'K52.9', description: 'Gastroenteritis and colitis, unspecified', category: 'Gastrointestinal' },

    // Neurological
    'G43.909': { code: 'G43.909', description: 'Migraine, unspecified, not intractable, without status migrainosus', category: 'Neurological' },
    'R51': { code: 'R51', description: 'Headache', category: 'Neurological' },
    'G40.909': { code: 'G40.909', description: 'Epilepsy, unspecified, not intractable, without status epilepticus', category: 'Neurological' },

    // Endocrine
    'E11.9': { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine' },
    'E78.5': { code: 'E78.5', description: 'Hyperlipidemia, unspecified', category: 'Endocrine' },
    'E03.9': { code: 'E03.9', description: 'Hypothyroidism, unspecified', category: 'Endocrine' },

    // Musculoskeletal
    'M25.50': { code: 'M25.50', description: 'Pain in unspecified joint', category: 'Musculoskeletal' },
    'M79.3': { code: 'M79.3', description: 'Panniculitis, unspecified', category: 'Musculoskeletal' },
    'M54.5': { code: 'M54.5', description: 'Low back pain', category: 'Musculoskeletal' },

    // General symptoms
    'R50.9': { code: 'R50.9', description: 'Fever, unspecified', category: 'General' },
    'R07.9': { code: 'R07.9', description: 'Chest pain, unspecified', category: 'General' },
    'R10.9': { code: 'R10.9', description: 'Unspecified abdominal pain', category: 'General' },
    'R05': { code: 'R05', description: 'Cough', category: 'General' },
    'R42': { code: 'R42', description: 'Dizziness and giddiness', category: 'General' },
};

// Common SNOMED CT codes
export const SNOMED_CODES: Record<string, SNOMEDCode> = {
    // Respiratory
    '82272006': { code: '82272006', description: 'Common cold', category: 'Respiratory' },
    '233604007': { code: '233604007', description: 'Pneumonia', category: 'Respiratory' },
    '54150009': { code: '54150009', description: 'Upper respiratory infection', category: 'Respiratory' },
    '10509002': { code: '10509002', description: 'Acute bronchitis', category: 'Respiratory' },
    '195967001': { code: '195967001', description: 'Asthma', category: 'Respiratory' },

    // Cardiovascular
    '38341003': { code: '38341003', description: 'Hypertensive disorder', category: 'Cardiovascular' },
    '57054005': { code: '57054005', description: 'Acute myocardial infarction', category: 'Cardiovascular' },
    '194828000': { code: '194828000', description: 'Angina pectoris', category: 'Cardiovascular' },
    '49436004': { code: '49436004', description: 'Atrial fibrillation', category: 'Cardiovascular' },

    // Gastrointestinal
    '235595009': { code: '235595009', description: 'Gastroesophageal reflux disease', category: 'Gastrointestinal' },
    '4556007': { code: '4556007', description: 'Gastritis', category: 'Gastrointestinal' },
    '74400008': { code: '74400008', description: 'Appendicitis', category: 'Gastrointestinal' },
    '14760008': { code: '14760008', description: 'Constipation', category: 'Gastrointestinal' },
    '25374005': { code: '25374005', description: 'Gastroenteritis', category: 'Gastrointestinal' },

    // Neurological
    '37796009': { code: '37796009', description: 'Migraine', category: 'Neurological' },
    '25064002': { code: '25064002', description: 'Headache', category: 'Neurological' },
    '84757009': { code: '84757009', description: 'Epilepsy', category: 'Neurological' },

    // Endocrine
    '44054006': { code: '44054006', description: 'Type 2 diabetes mellitus', category: 'Endocrine' },
    '55822004': { code: '55822004', description: 'Hyperlipidemia', category: 'Endocrine' },
    '40930008': { code: '40930008', description: 'Hypothyroidism', category: 'Endocrine' },

    // Musculoskeletal
    '57676002': { code: '57676002', description: 'Joint pain', category: 'Musculoskeletal' },
    '22253000': { code: '22253000', description: 'Pain', category: 'Musculoskeletal' },
    '279039007': { code: '279039007', description: 'Low back pain', category: 'Musculoskeletal' },

    // General symptoms
    '386661006': { code: '386661006', description: 'Fever', category: 'General' },
    '29857009': { code: '29857009', description: 'Chest pain', category: 'General' },
    '21522001': { code: '21522001', description: 'Abdominal pain', category: 'General' },
    '49727002': { code: '49727002', description: 'Cough', category: 'General' },
    '404640003': { code: '404640003', description: 'Dizziness', category: 'General' },
};

// Keyword-based mapping for classification
export const CLASSIFICATION_MAPPINGS: Classification[] = [
    {
        icd: ICD_CODES['J00'],
        snomed: SNOMED_CODES['82272006'],
        keywords: ['cold', 'runny nose', 'nasal', 'congestion', 'sneezing']
    },
    {
        icd: ICD_CODES['J18.9'],
        snomed: SNOMED_CODES['233604007'],
        keywords: ['pneumonia', 'lung infection', 'productive cough', 'chest infection']
    },
    {
        icd: ICD_CODES['J06.9'],
        snomed: SNOMED_CODES['54150009'],
        keywords: ['upper respiratory', 'throat', 'sore throat', 'uri']
    },
    {
        icd: ICD_CODES['I10'],
        snomed: SNOMED_CODES['38341003'],
        keywords: ['hypertension', 'high blood pressure', 'elevated bp', 'htn']
    },
    {
        icd: ICD_CODES['I21.9'],
        snomed: SNOMED_CODES['57054005'],
        keywords: ['heart attack', 'myocardial infarction', 'mi', 'stemi', 'nstemi']
    },
    {
        icd: ICD_CODES['I20.9'],
        snomed: SNOMED_CODES['194828000'],
        keywords: ['angina', 'chest pain', 'cardiac pain', 'chest pressure']
    },
    {
        icd: ICD_CODES['K21.9'],
        snomed: SNOMED_CODES['235595009'],
        keywords: ['gerd', 'reflux', 'heartburn', 'acid reflux']
    },
    {
        icd: ICD_CODES['K35.80'],
        snomed: SNOMED_CODES['74400008'],
        keywords: ['appendicitis', 'right lower quadrant pain', 'mcburney']
    },
    {
        icd: ICD_CODES['G43.909'],
        snomed: SNOMED_CODES['37796009'],
        keywords: ['migraine', 'severe headache', 'aura', 'photophobia']
    },
    {
        icd: ICD_CODES['E11.9'],
        snomed: SNOMED_CODES['44054006'],
        keywords: ['diabetes', 'diabetic', 'type 2 diabetes', 't2dm', 'hyperglycemia']
    },
    {
        icd: ICD_CODES['R50.9'],
        snomed: SNOMED_CODES['386661006'],
        keywords: ['fever', 'pyrexia', 'high temperature', 'febrile']
    },
    {
        icd: ICD_CODES['R07.9'],
        snomed: SNOMED_CODES['29857009'],
        keywords: ['chest pain', 'thoracic pain', 'precordial pain']
    },
    {
        icd: ICD_CODES['R10.9'],
        snomed: SNOMED_CODES['21522001'],
        keywords: ['abdominal pain', 'stomach pain', 'belly pain', 'abd pain']
    },
    {
        icd: ICD_CODES['R05'],
        snomed: SNOMED_CODES['49727002'],
        keywords: ['cough', 'coughing', 'dry cough', 'productive cough']
    },
    {
        icd: ICD_CODES['M54.5'],
        snomed: SNOMED_CODES['279039007'],
        keywords: ['back pain', 'lower back pain', 'lumbago', 'backache']
    },
    {
        icd: ICD_CODES['R51'],
        snomed: SNOMED_CODES['25064002'],
        keywords: ['headache', 'head pain', 'cephalgia']
    },
];

/**
 * Find the best matching classification based on keywords in text
 */
export function findClassificationByKeywords(text: string): Classification | null {
    const lowerText = text.toLowerCase();

    for (const mapping of CLASSIFICATION_MAPPINGS) {
        for (const keyword of mapping.keywords) {
            if (lowerText.includes(keyword.toLowerCase())) {
                return mapping;
            }
        }
    }

    return null;
}

/**
 * Get all possible classifications from text (may return multiple)
 */
export function getAllMatchingClassifications(text: string): Classification[] {
    const lowerText = text.toLowerCase();
    const matches: Classification[] = [];

    for (const mapping of CLASSIFICATION_MAPPINGS) {
        for (const keyword of mapping.keywords) {
            if (lowerText.includes(keyword.toLowerCase())) {
                if (!matches.includes(mapping)) {
                    matches.push(mapping);
                }
                break;
            }
        }
    }

    return matches;
}
