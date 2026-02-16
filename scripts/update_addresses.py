import json
import os

# Data path
INDEX_FILE = 'app/public/data/map_index.json'

# Target updates
updates = [
    {
        "name_keywords": ["Курчатовский"],
        "lat": 55.801379, "lon": 37.477063,
        "address": "город Москва, пл. Академика Курчатова, д.1"
    },
    {
        "name_keywords": ["РАНХиГС", "НАРОДНОГО ХОЗЯЙСТВА"],
        "lat": 55.665111, "lon": 37.479359,
        "address": "пр-кт. Вернадского, д. 82, стр. 1"
    },
    {
        "name_keywords": ["ИБРАЭ"],
        "lat": 55.707747, "lon": 37.625841,
        "address": "г. Москва, Большая Тульская ул., д. 52"
    },
    {
        "name_keywords": ["ИФЗ"],
        "lat": 55.766861, "lon": 37.581561,
        "address": "г. Москва, Б. Грузинская ул., д. 10"
    },
    {
        "name_keywords": ["ИОФ"],
        "lat": 55.695433, "lon": 37.567123,
        "address": "г. Москва, ул. Вавилова д. 38"
    },
    {
        "name_keywords": ["ИРИ"],
        "lat": 55.688969, "lon": 37.572621,
        "address": "Москва ул. Дмитрия Ульянова, д. 19"
    },
    {
        "name_keywords": ["ЦЭПР"],
        "lat": 55.823575, "lon": 37.502040,
        "address": "проезд Старопетровский, д. 1А, пом. 3/1"
    },
    {
        "name_keywords": ["ИЛА"],
        "lat": 55.741551, "lon": 37.625316,
        "address": "Москва, ул. Большая Ордынка, д. 21/16"
    },
    {
        "name_keywords": ["ЭЛЕКТРОННОГО МАШИНОСТРОЕНИЯ"],
        "lat": 55.997567, "lon": 37.218649,
        "address": "г. Москва, вн. тер. г. муниципальный округ Савелки, г. Зеленоград, к. 313А"
    },
    {
        "name_keywords": ["ВартПро"],
        "lat": 55.731364, "lon": 37.768983,
        "address": "г. Москва, ул. Зарайская, д. 21"
    },
    {
        "name_keywords": ["АЭРОГЕЙМ"],
        "lat": 55.685858, "lon": 37.441763,
        "address": "ш. Очаковское, д. 28, стр. 1, этаж 4, офис 21"
    }
]

def update_map_data():
    if not os.path.exists(INDEX_FILE):
        print(f"File not found: {INDEX_FILE}")
        return

    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    centers = data.get('centers', [])
    updated_count = 0

    print(f"Total centers before update: {len(centers)}")

    for update in updates:
        keywords = [k.lower() for k in update['name_keywords']]
        found = False
        
        for center in centers:
            name = center.get('name', '').lower()
            short_name = (center.get('short_name') or '').lower()
            
            # Check if ANY keyword matches EITHER name or short_name
            # For multiple keywords, we treat them as OR logic for identification? 
            # Or safer to treat list as 'one of these must match'
            match = False
            for k in keywords:
                if k in name or k in short_name:
                    match = True
                    break
            
            if match:
                print(f"Updating: {center.get('short_name') or center.get('name')}")
                print(f"  Old: {center.get('lat')}, {center.get('lon')}")
                print(f"  New: {update['lat']}, {update['lon']}")
                
                center['lat'] = update['lat']
                center['lon'] = update['lon']
                center['address'] = update['address']
                updated_count += 1
                found = True
                # Break inner loop if we assume one center matches one update rule.
                # However, there might be duplicate centers? Assuming uniqueness for now.
                break 
        
        if not found:
            print(f"WARNING: No center found for keywords: {keywords}")

    print(f"\nTotal updated: {updated_count}")

    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    update_map_data()
