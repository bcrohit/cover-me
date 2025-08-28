import os
import json

os.sep = '/'

def get_prompt(prompt_file, prompt_dir=r'assets\prompts'):
    """Load a prompt from a file.

    Args:
        prompt_file (str): Name of the prompt file.
        prompt_dir (str, optional): Path to the prompt directory. Defaults to 'assets/prompts'.

    Returns:
        str: prompt
    """
    prompt_path = os.path.join(prompt_dir, prompt_file)
    return open(prompt_path, 'r', encoding='utf-8').read()

def get_job_data(job_data_file, job_data_dir=r'assets\contents'):
    """Load job data from a file.

    Args:
        job_data_file (str): Name of the job data file.
        job_data_dir (str, optional): Path to the job data directory. Defaults to 'assets/contents'.

    Returns:
        dict: job data
    """
    job_data_path = os.path.join(job_data_dir, job_data_file)
    return json.load(open(job_data_path, 'r', encoding='utf-8'))