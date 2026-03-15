
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — running in mock/fallback mode');
}

const FALLBACK_URL = 'https://placeholder.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder';

export const supabase = createClient(supabaseUrl || FALLBACK_URL, supabaseKey || FALLBACK_KEY);

export const LLM_API_KEY = process.env.LLM_API_KEY;
export const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.cerebras.ai/v1';
export const LLM_MODEL = process.env.LLM_MODEL || 'llama3.1-8b';

export { fetch };

export const PINCODE_AREAS = {
    '110001': 'Delhi Central',
    '110016': 'South Delhi',
    '110019': 'Defence Colony, Delhi',
    '110025': 'Connaught Place, Delhi',
    '110029': 'Rohini, Delhi',
    '400001': 'Mumbai Fort',
    '400050': 'Mumbai Bandra',
    '400070': 'Mumbai Andheri',
    '400092': 'Mumbai Borivali',
    '400101': 'Mumbai Navi Mumbai',
    '560001': 'Bangalore Central',
    '560017': 'Bangalore Rajaji Nagar',
    '560034': 'Bangalore Jayanagar',
    '560066': 'Bangalore Whitefield',
    '560103': 'Bangalore Electronic City',
    '600001': 'Chennai Central',
    '600004': 'Chennai Mylapore',
    '600017': 'Chennai T Nagar',
    '600096': 'Chennai Velachery',
    '700001': 'Kolkata Central',
    '700019': 'Kolkata Alipore',
    '700053': 'Kolkata Salt Lake',
    '500001': 'Hyderabad Central',
    '500016': 'Hyderabad Secunderabad',
    '500032': 'Hyderabad Banjara Hills',
    '500081': 'Hyderabad Gachibowli',
    '411001': 'Pune Central',
    '411004': 'Pune Shivajinagar',
    '411038': 'Pune Kothrud',
    '380001': 'Ahmedabad Central',
    '380015': 'Ahmedabad Navrangpura',
    '302001': 'Jaipur Central',
    '302015': 'Jaipur Civil Lines',
    '226001': 'Lucknow Central',
    '226010': 'Lucknow Gomti Nagar',
    '682001': 'Kochi Fort',
    '682020': 'Kochi Kakkanad'
};

export const detectAreaFromPincode = (pincode) => {
    if (!pincode) return 'Unknown Area';
    const area = PINCODE_AREAS[pincode];
    if (area) return area;

    const prefix = pincode.slice(0, 3);
    const regionMap = {
        '110': 'Delhi Region',
        '400': 'Mumbai Region',
        '560': 'Bangalore Region',
        '600': 'Chennai Region',
        '700': 'Kolkata Region',
        '500': 'Hyderabad Region',
        '411': 'Pune Region',
        '380': 'Ahmedabad Region',
        '302': 'Jaipur Region',
        '226': 'Lucknow Region',
        '682': 'Kochi Region'
    };

    return regionMap[prefix] || `Area ${prefix}`;
};
