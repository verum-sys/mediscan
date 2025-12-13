
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand, UpdateCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

console.log("---------------------------------------------------");
console.log("   DYNAMO SERVICE RELOADED - AGGRESSIVE FILTERING  ");
console.log("---------------------------------------------------");
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

export const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    } : undefined
});

export const docClient = DynamoDBDocumentClient.from(client);

export const LLM_API_KEY = process.env.LLM_API_KEY;
export const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.cerebras.ai/v1';
export const LLM_MODEL = process.env.LLM_MODEL || 'llama-3.3-70b';

// --- Helper Functions ---
export const scanTable = async (tableName) => {
    const command = new ScanCommand({ TableName: tableName });
    const response = await docClient.send(command);
    return response.Items || [];
};

// Pincode to Area mapping (Indian pincodes)
export const PINCODE_AREAS = {
    // Delhi
    '110001': 'Delhi Central',
    '110016': 'South Delhi',
    '110019': 'Defence Colony, Delhi',
    '110025': 'Connaught Place, Delhi',
    '110029': 'Rohini, Delhi',

    // Mumbai
    '400001': 'Mumbai Fort',
    '400050': 'Mumbai Bandra',
    '400070': 'Mumbai Andheri',
    '400092': 'Mumbai Borivali',
    '400101': 'Mumbai Navi Mumbai',

    // Bangalore
    '560001': 'Bangalore Central',
    '560017': 'Bangalore Rajaji Nagar',
    '560034': 'Bangalore Jayanagar',
    '560066': 'Bangalore Whitefield',
    '560103': 'Bangalore Electronic City',

    // Chennai
    '600001': 'Chennai Central',
    '600004': 'Chennai Mylapore',
    '600017': 'Chennai T Nagar',
    '600096': 'Chennai Velachery',

    // Kolkata
    '700001': 'Kolkata Central',
    '700019': 'Kolkata Alipore',
    '700053': 'Kolkata Salt Lake',

    // Hyderabad
    '500001': 'Hyderabad Central',
    '500016': 'Hyderabad Secunderabad',
    '500032': 'Hyderabad Banjara Hills',
    '500081': 'Hyderabad Gachibowli',

    // Pune
    '411001': 'Pune Central',
    '411004': 'Pune Shivajinagar',
    '411038': 'Pune Kothrud',

    // Ahmedabad
    '380001': 'Ahmedabad Central',
    '380015': 'Ahmedabad Navrangpura',

    // Jaipur
    '302001': 'Jaipur Central',
    '302015': 'Jaipur Civil Lines',

    // Lucknow
    '226001': 'Lucknow Central',
    '226010': 'Lucknow Gomti Nagar',

    // Kochi
    '682001': 'Kochi Fort',
    '682020': 'Kochi Kakkanad'
};

export const detectAreaFromPincode = (pincode) => {
    if (!pincode) return 'Unknown Area';
    const area = PINCODE_AREAS[pincode];
    if (area) return area;

    // Fallback: Use first 3 digits to identify region
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

    return regionMap[prefix] || `Area ${prefix} `;
};
