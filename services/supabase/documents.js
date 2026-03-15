
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './client.js';

export const createDocument = async (docData) => {
    const id = uuidv4();
    const created_at = new Date().toISOString();
    const { error } = await supabase.from('documents').insert({ id, data: docData, created_at });
    if (error) {
        console.error("Error creating document in Supabase:", error);
        throw error;
    }
    return { id, ...docData, created_at };
};

export const getDocument = async (docId) => {
    const { data, error } = await supabase.from('documents').select('*').eq('id', docId).single();
    if (error || !data) {
        console.error("Error fetching document from Supabase:", error);
        throw new Error("Document not found");
    }
    return { ...data.data, id: data.id, created_at: data.created_at };
};

export const createLLMTask = async (taskData) => {
    const id = uuidv4();
    const created_at = new Date().toISOString();
    const { error } = await supabase.from('llm_tasks').insert({ id, data: taskData, created_at });
    if (error) { console.error("Error creating LLM task:", error); return null; }
    return { id, ...taskData, created_at };
};
