"""
Utility for loading training data from CSV files.
"""
import csv
import os


def load_training_data(csv_path, text_column="text", label_column="label"):
    """
    Load training data from a CSV file.

    Args:
        csv_path: Path to CSV file with text and label columns.
        text_column: Name of the text column in the CSV (default: "text").
        label_column: Name of the label column in the CSV (default: "label").

    Returns:
        Tuple of (texts, labels) lists.

    Raises:
        FileNotFoundError: If csv_path does not exist.
        ValueError: If CSV has no valid rows.
    """
    if not os.path.isfile(csv_path):
        raise FileNotFoundError(f"Training CSV not found: {csv_path}")

    texts, labels = [], []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            text = row.get(text_column, "").strip()
            label_raw = row.get(label_column, "").strip()
            if not text or not label_raw:
                continue
            texts.append(text)
            labels.append(int(label_raw))

    if not texts:
        raise ValueError(f"CSV at {csv_path} has no valid rows")

    print(f"Loaded {len(texts)} samples from {csv_path}")
    return texts, labels
