import csv
import sys

files = [
    "BASE EMPLEADOS A JULIO 2025.csv",
    "UNIDAD OPERATIVA JALISCO.csv"
]

def analyze(filename):
    print(f"--- Analyzing {filename} ---")
    encodings = ['utf-8', 'latin-1', 'cp1252']
    
    for enc in encodings:
        try:
            print(f"Trying encoding: {enc}")
            with open(filename, 'r', encoding=enc) as f:
                lines = [f.readline().strip() for _ in range(5)]
                for i, line in enumerate(lines):
                    print(f"L{i}: {line}")
                return # Success
        except UnicodeDecodeError:
            continue
        except Exception as e:
            print(f"Error {e}")
            return

for f in files:
    analyze(f)
