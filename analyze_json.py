import json

def analyze_file(filename):
    print(f"Analyzing {filename}...")
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if isinstance(data, list) and len(data) > 0:
                item = data[0]
                print("Keys found:", list(item.keys()))
                # Print potential funding fields
                for k, v in item.items():
                    if 'finance' in k.lower() or 'money' in k.lower() or 'sum' in k.lower() or 'cost' in k.lower() or 'amount' in k.lower():
                        print(f"Potential funding field: {k} = {v}")
            else:
                print("Empty list or not a list")
    except Exception as e:
        print(f"Error: {e}")

analyze_file('open_data_ikrbs_2025_all_months.json')
analyze_file('open_data_iksi_2025_all_months.json')
