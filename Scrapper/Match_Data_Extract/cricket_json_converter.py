import json
import csv
import sys
import os
import pandas as pd
from typing import Dict, List, Any, Union, Optional

def flatten_dict(d: Dict, parent_key: str = '', sep: str = '_') -> Dict:
    """
    Flatten a nested dictionary structure.
    
    Args:
        d: The dictionary to flatten
        parent_key: The parent key for the current dictionary
        sep: Separator between keys
        
    Returns:
        Flattened dictionary
    """
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        elif isinstance(v, list):
            # For lists, we'll stringify them unless they're a list of dicts
            if v and isinstance(v[0], dict):
                # If it's a list of dicts, we'll just use the first item
                # This is a simplification - you may want to handle this differently
                items.extend(flatten_dict(v[0], new_key, sep=sep).items())
            else:
                items.append((new_key, str(v)))
        else:
            items.append((new_key, v))
    return dict(items)

def process_commentary(data_array: List[Dict], output_file: str) -> Optional[str]:
    """
    Process a standard commentary array and write to CSV.
    
    Args:
        data_array: List of commentary dictionaries
        output_file: Path to output CSV file
        
    Returns:
        Path to created file or None if error
    """
    if not data_array:
        print(f"No data available for {output_file}.")
        return None
        
    try:
        # Convert the list of dictionaries to a pandas DataFrame
        df = pd.DataFrame(data_array)
        
        # Write to CSV
        df.to_csv(output_file, index=False)
        print(f"Successfully created: {output_file}")
        return output_file
    except Exception as e:
        print(f"Error writing CSV file {output_file}: {e}")
        return None

def process_commentary_with_over_summary(data_array: List[Dict], output_prefix: str) -> List[str]:
    """
    Process commentary_with_over_summary which has nested structure.
    
    Args:
        data_array: List of dictionaries with nested structure
        output_prefix: Prefix for output CSV files
        
    Returns:
        List of created file paths
    """
    created_files = []
    
    # Process match_over_summary
    over_summaries = []
    for item in data_array:
        if 'match_over_summary' in item:
            # Flatten the structure
            flattened_summary = flatten_dict(item['match_over_summary'])
            over_summaries.append(flattened_summary)
    
    if over_summaries:
        summary_file = f"{output_prefix}_over_summaries.csv"
        df = pd.DataFrame(over_summaries)
        df.to_csv(summary_file, index=False)
        created_files.append(summary_file)
        print(f"Successfully created: {summary_file}")
    
    # Process match_over_balls (nested array in each item)
    all_balls = []
    for item in data_array:
        if 'match_over_balls' in item and isinstance(item['match_over_balls'], list):
            for ball in item['match_over_balls']:
                all_balls.append(ball)
    
    if all_balls:
        balls_file = f"{output_prefix}_over_balls.csv"
        df = pd.DataFrame(all_balls)
        df.to_csv(balls_file, index=False)
        created_files.append(balls_file)
        print(f"Successfully created: {balls_file}")
    
    return created_files

def process_commentary_with_extended_summary(data_array: List[Dict], output_prefix: str) -> List[str]:
    """
    Process commentary_with_extended_summary which has type and data structure.
    
    Args:
        data_array: List of dictionaries with {type, data} structure
        output_prefix: Prefix for output CSV files
        
    Returns:
        List of created file paths
    """
    created_files = []
    
    # Group items by type
    grouped_data = {}
    for item in data_array:
        item_type = item.get('type', 'unknown')
        if item_type not in grouped_data:
            grouped_data[item_type] = []
        
        # Flatten the data part of the structure
        if 'data' in item and isinstance(item['data'], dict):
            flattened_data = flatten_dict(item['data'])
            grouped_data[item_type].append(flattened_data)
    
    # Create a CSV for each type
    for item_type, items in grouped_data.items():
        if items:
            type_file = f"{output_prefix}_extended_{item_type}.csv"
            df = pd.DataFrame(items)
            df.to_csv(type_file, index=False)
            created_files.append(type_file)
            print(f"Successfully created: {type_file}")
    
    return created_files

def convert_json_to_csv(json_data: Union[str, Dict], output_prefix: str = 'output') -> List[str]:
    """
    Convert JSON data to CSV format, handling all three commentary types.
    
    Args:
        json_data: JSON data either as a string or parsed dictionary
        output_prefix: Prefix for the output CSV files
    
    Returns:
        List of paths to the generated CSV files
    """
    # Parse JSON if it's a string
    if isinstance(json_data, str):
        try:
            data = json.loads(json_data)
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}")
            return []
    else:
        data = json_data
    
    # Check if the data has the expected structure
    if not data.get('status') or not data.get('data'):
        print("Invalid JSON structure. Expected format: { status: boolean, data: {...} }")
        return []
    
    created_files = []
    
    # Process regular commentary
    if 'commentary' in data['data'] and data['data']['commentary']:
        commentary_file = f"{output_prefix}_commentary.csv"
        result = process_commentary(data['data']['commentary'], commentary_file)
        if result:
            created_files.append(result)
    
    # Process commentary_with_over_summary
    if 'commentary_with_over_summary' in data['data'] and data['data']['commentary_with_over_summary']:
        summary_files = process_commentary_with_over_summary(
            data['data']['commentary_with_over_summary'],
            output_prefix
        )
        created_files.extend(summary_files)
    
    # Process commentary_with_extended_summary
    if 'commentary_with_extended_summary' in data['data'] and data['data']['commentary_with_extended_summary']:
        extended_files = process_commentary_with_extended_summary(
            data['data']['commentary_with_extended_summary'],
            output_prefix
        )
        created_files.extend(extended_files)
    
    return created_files

def main():
    # Check if JSON file path is provided as command line argument
    if len(sys.argv) > 1:
        json_file_path = sys.argv[1]
        output_prefix = sys.argv[2] if len(sys.argv) > 2 else 'output'
        
        # Read JSON file
        try:
            with open(json_file_path, 'r', encoding='utf-8') as file:
                json_data = json.load(file)
            
            # Convert to CSV
            convert_json_to_csv(json_data, output_prefix)
        except Exception as e:
            print(f"Error reading or processing JSON file: {e}")
    else:
        print("Usage: python script.py input.json [output_prefix]")
        print("No input file specified. Please provide a JSON file path.")

if __name__ == "__main__":
    main()