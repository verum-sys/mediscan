import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
    try {
        const response = await fetch(`${process.env.LLM_BASE_URL}/models`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.LLM_API_KEY}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Failed to list models:', err);
            return;
        }

        const data = await response.json();
        console.log('Available Models:');
        data.data.forEach(model => console.log(`- ${model.id}`));
    } catch (error) {
        console.error('Error:', error);
    }
}
listModels();
