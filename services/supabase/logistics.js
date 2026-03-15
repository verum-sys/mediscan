
export const getDrugDetails = (drugName) => {
    const db = {
        'Amoxicillin': { salt: 'Amoxicillin + Clavulanic Acid', brands: ['Augmentin', 'Amoxil', 'Clavulin'] },
        'Paracetamol': { salt: 'Paracetamol', brands: ['Tylenol', 'Panadol', 'Crocin'] },
        'Ibuprofen': { salt: 'Ibuprofen', brands: ['Advil', 'Brufen', 'Nurofen'] },
        'Metformin': { salt: 'Metformin Hydrochloride', brands: ['Glucophage', 'Glycomet', 'Riomet'] },
        'Atorvastatin': { salt: 'Atorvastatin Calcium', brands: ['Lipitor', 'Atorva', 'Storvas'] },
        'Omeprazole': { salt: 'Omeprazole', brands: ['Prilosec', 'Omez', 'Losec'] },
        'Azithromycin': { salt: 'Azithromycin', brands: ['Zithromax', 'Azithral', 'Z-Pak'] },
        'Pantoprazole': { salt: 'Pantoprazole Sodium', brands: ['Pantocid', 'Protonix', 'Pan40'] },
        'Cetirizine': { salt: 'Cetirizine Hydrochloride', brands: ['Zyrtec', 'Cetzine', 'Reactine'] },
        'Montelukast': { salt: 'Montelukast Sodium', brands: ['Singulair', 'Montek', 'Telekast'] }
    };

    const cleanName = drugName ? drugName.split(' ')[0] : 'Unknown';
    const found = Object.entries(db).find(([k]) => drugName && drugName.toLowerCase().includes(k.toLowerCase()));

    if (found) return found[1];
    return { salt: `${cleanName} Active Ingredient`, brands: [`${cleanName}-BrandA`, `${cleanName}-BrandB`] };
};

export const generateMedicationLogistics = (drugName) => {
    const details = getDrugDetails(drugName);
    const rand = Math.random();
    let status = 'Available';
    if (rand > 0.7) status = 'Low Stock';
    if (rand > 0.9) status = 'Out of Stock';

    let quantity = 0;
    if (status === 'Available') quantity = Math.floor(Math.random() * 50) + 20;
    if (status === 'Low Stock') quantity = Math.floor(Math.random() * 9) + 1;

    const logistics = { salt_composition: details.salt, stock_status: status, current_stock: `${quantity} boxes`, alternatives: [] };
    if (status !== 'Available') {
        logistics.alternatives = details.brands.slice(0, 2).map(brand => ({
            brand_name: brand,
            stock: `${Math.floor(Math.random() * 50) + 30} boxes`
        }));
    }
    return logistics;
};

export const generateLabLogistics = (testName) => {
    const queueSize = Math.floor(Math.random() * 12);
    let queueStatus = 'Walk-in Available';
    if (queueSize > 4) queueStatus = 'Busy';
    if (queueSize > 9) queueStatus = 'High Wait Time';

    const now = new Date();
    const minutesToAdd = (queueSize * 15) + 20;
    const nextSlotTime = new Date(now.getTime() + minutesToAdd * 60000);
    const timeString = nextSlotTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const dateString = nextSlotTime.getDate() === now.getDate() ? "Today" : "Tomorrow";

    return {
        live_queue: queueSize === 0 ? "Empty" : `${queueSize} people in queue`,
        next_available_slot: `${dateString}, ${timeString}`,
        status: queueStatus
    };
};
