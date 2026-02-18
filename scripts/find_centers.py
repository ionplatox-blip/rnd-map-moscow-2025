import json
import sys

def find_centers():
    with open('app/public/data/map_index.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    targets = [
        'Высшая школа экономики', 
        'Математический институт', 
        'ДЕРМАТОВЕНЕРОЛОГИИ', 
        'ВИАМ', 
        'АВТОМОБИЛЬНОГО ТРАНСПОРТА', 
        'Институт вычислительной математики', 
        'РАДИО ИМЕНИ М.И. КРИВОШЕЕВА', 
        'ВИДУЧИ', 
        'НИИОЗММ', 
        'ВЫСОКИХ ТЕМПЕРАТУР', 
        'МИСИС', 
        'ГАМАЛЕИ', 
        'ОКЕАНОЛОГИИ', 
        'ЗЕЛЕНОГРАДСКИЙ НАНОТЕХНОЛОГИЧЕСКИЙ', 
        'Атомэнергопроект', 
        'БИОТЕХНОЛОГИИ', 
        'НИКИЭТ', 
        'ИФХЭ', 
        'ПРОРЫВ', 
        'БИООРГАНИЧЕСКОЙ ХИМИИ'
    ]
    
    results = []
    for c in data['centers']:
        name = c['name'].upper()
        short = (c.get('short_name') or '').upper()
        found = False
        for t in targets:
            if t.upper() in name or t.upper() in short:
                results.append(f"{c['ogrn']} | {c.get('short_name', '')} | {c['name']}")
                break
                
    for r in sorted(results):
        print(r)

if __name__ == "__main__":
    find_centers()
