
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';

// Fix for default marker icon in Leaflet with React
// (Though we are using CircleMarkers, it's good practice just in case)
import L from 'leaflet';

interface UPMapProps {
    data: { name: string; count: number }[];
}

// Coordinates for major UP cities/areas to map data to
const LOCATION_MAP: Record<string, [number, number]> = {
    'Lucknow': [26.8467, 80.9462],
    'Kanpur': [26.4499, 80.3319],
    'Varanasi': [25.3176, 82.9739],
    'Agra': [27.1767, 78.0081],
    'Noida': [28.5355, 77.3910],
    'Ghaziabad': [28.6692, 77.4538],
    'Meerut': [28.9845, 77.7064],
    'Prayagraj': [25.4358, 81.8463],
    'Bareilly': [28.3670, 79.4304],
    'Aligarh': [27.8974, 78.0880],
    'Moradabad': [28.8386, 78.7733],
    'Saharanpur': [29.9640, 77.5448],
    'Gorakhpur': [26.7606, 83.3732],
    // Fallbacks or generic centers for other district names could be added here
    'Firozabad': [27.159840, 78.395767],
    'Jhansi': [25.4486, 78.5696],
    'Muzaffarnagar': [29.470042, 77.703241],
    'Mathura': [27.4924, 77.6737],
    'Ayodhya': [26.7915, 82.1998]
};

// Helper to get coordinates, or random adjustment around Lucknow if unknown
const getCoordinates = (name: string): [number, number] => {
    // Try exact match
    if (LOCATION_MAP[name]) return LOCATION_MAP[name];

    // Try case-insensitive
    const key = Object.keys(LOCATION_MAP).find(k => k.toLowerCase() === name.toLowerCase());
    if (key) return LOCATION_MAP[key];

    // If strictly "Uttar Pradesh" or unknown, maybe place randomly or central
    // For now, let's hash the string to a deterministic specific random point within UP bounds
    // UP Bounds roughly: Lat 23.9-30.4, Lng 77.1-84.6

    // Simple hash
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Normalize to offsets
    const latOffset = (hash % 100) / 50; // -2 to 2ish
    const lngOffset = ((hash >> 16) % 100) / 50;

    return [26.8 + latOffset * 1.5, 80.9 + lngOffset * 1.5];
};

export default function UPMap({ data }: UPMapProps) {
    const defaultCenter: [number, number] = [27.0, 80.9]; // Roughly Center of UP
    const zoom = 6;

    // Process data to have coordinates
    const mapData = useMemo(() => {
        return data.map(item => ({
            ...item,
            position: getCoordinates(item.name)
        }));
    }, [data]);

    // Component to handle bounds if needed, but static center is fine for state map

    return (
        <div className="h-[500px] w-full rounded-xl overflow-hidden shadow-sm border z-0 relative">
            <MapContainer
                center={defaultCenter}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                {/* 
                    Using CartoDB Voyager tiles for a clean, light map look.
                    Alternatives: OpenStreetMap default (more cluttered).
                */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                {mapData.map((item, idx) => (
                    <CircleMarker
                        key={`${item.name}-${idx}`}
                        center={item.position}
                        pathOptions={{
                            color: '#ef4444', // Red-500
                            fillColor: '#ef4444',
                            fillOpacity: 0.6,
                            weight: 1
                        }}
                        radius={Math.max(5, Math.min(20, Math.sqrt(item.count) * 4))} // Scale radius by cases
                    >
                        <Popup>
                            <div className="text-center">
                                <strong className="block text-sm font-bold">{item.name}</strong>
                                <span className="text-red-500 font-bold text-lg">{item.count} Cases</span>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>
        </div>
    );
}
