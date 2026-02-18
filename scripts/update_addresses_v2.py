import json
import os

def update_addresses():
    filepath = 'app/public/data/map_index.json'
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Final corrected mapping of OGRN to new address and coordinates
    updates = {
        '1027739630401': {'address': 'г. Москва, ул. Мясницкая, д. 20', 'lat': 55.761553, 'lon': 37.633428}, # HSE
        '1027739665436': {'address': 'Москва, ул. Губкина, д. 8', 'lat': 55.694769, 'lon': 37.564383}, # Steklov
        '1087746788095': {'address': 'ул. Короленко, 3, стр.6, Москва, Россия, 107076', 'lat': 55.796294, 'lon': 37.691863}, # Dermatovenerology
        '1027739045399': {'address': '105005, Россия, Москва, ул. Радио, д. 17', 'lat': 55.764030, 'lon': 37.675801}, # VIAM (Fixed OGRN)
        '1067746375278': {'address': 'г. Москва, ул. Героев Панфиловцев д.24', 'lat': 55.855563, 'lon': 37.408714}, # NII AT
        '1027700542363': {'address': '119333, г. Москва, ул. Губкина, дом 8', 'lat': 55.694769, 'lon': 37.564383}, # IVM Marchuk
        '1227700388827': {'address': '105064, Москва, Казакова ул., д. 16', 'lat': 55.762672, 'lon': 37.664707}, # RNII Radio
        '1237700521849': {'address': '107553, г. Москва, вн.тер.г. Муниципальный Округ Гольяново, ул. Амурская, д. 1А, к. 3, помещ. 4/3', 'lat': 55.808306, 'lon': 37.760054}, # Viduchi
        '1027700495635': {'address': '115088, г. Москва, Шарикоподшипниковская ул., д. 9, помещ. 5Ц', 'lat': 55.721564, 'lon': 37.672037}, # NIIOZMM
        '1027739271009': {'address': '125412, г. Москва, ул. Ижорская, д. 13, стр. 2', 'lat': 55.893657, 'lon': 37.520761}, # OIVT RAN
        '1027739439749': {'address': '119049, Москва, Ленинский пр-кт, д. 4, стр. 1', 'lat': 55.72842, 'lon': 37.60872}, # MISIS (Fixed OGRN)
        '1027739443555': {'address': '123098, г. Москва, ул. Гамалеи, д. 18', 'lat': 55.801724, 'lon': 37.45319}, # Gamaleya (Fixed OGRN)
        '1037739013388': {'address': '117997, г. Москва, Нахимовский проспект, д. 36', 'lat': 55.677448, 'lon': 37.569773}, # IO RAN Shirshov
        '1107746582052': {'address': '124527, г. Москва, г. Зеленоград, аллея Солнечная, д. 6, помещение IX, офис 17', 'lat': 55.982603, 'lon': 37.202991}, # ZNTC
        '1087746998646': {'address': '107996, г. Москва, ул. Бакунинская, д. 7, стр. 1', 'lat': 55.774360, 'lon': 37.681344}, # AEP
        '1037700131633': {'address': '119071, г. Москва, Ленинский проспект, д. 33, стр. 2', 'lat': 55.711539, 'lon': 37.589832}, # FIC Biotech
        '1097746180740': {'address': '107140, г. Москва, ул. Малая Красносельская, д. 2/8', 'lat': 55.788363, 'lon': 37.653559}, # NIKIET
        '1037739294230': {'address': '119071, Москва, Ленинский проспект, д. 31, корп. 4', 'lat': 55.712452, 'lon': 37.589311}, # IFHE RAN
        '1187746578480': {'address': '119607, г. Москва, вн. тер. г. муниципальный округ Раменки, Раменский бульвар, д. 1', 'lat': 55.692120, 'lon': 37.516557}, # Proryv
        '1037739009110': {'address': '117437, г. Москва, вн. тер.г. муниципальный округ Коньково, ул. Миклухо-Маклая, д. 16/10, к. 1', 'lat': 55.648113, 'lon': 37.511221}, # IBH RAN
    }
    
    updated_count = 0
    for center in data['centers']:
        ogrn = center.get('ogrn')
        if ogrn in updates:
            upd = updates[ogrn]
            center['address'] = upd['address']
            center['lat'] = upd['lat']
            center['lon'] = upd['lon']
            updated_count += 1
            print(f"Updated: {center['name']} -> {upd['address']}")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\nDone! Updated {updated_count} out of {len(updates)} centers.")

if __name__ == "__main__":
    update_addresses()
