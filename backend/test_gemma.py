import os
from huggingface_hub import login
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("HF_TOKEN")
if token:
    login(token=token, add_to_git_credential=False)
else:
    print("[WARN] HF_TOKEN environment variable not set.")

from transformers import AutoTokenizer, BitsAndBytesConfig, Gemma3ForCausalLM
import torch

def main():
    print("=== Outsurance Gemma 3 1B Runner ===")
    model_id = "google/gemma-3-1b-it"

    print(f"Loading tokenizer and quantization config for {model_id}...")
    quantization_config = BitsAndBytesConfig(load_in_8bit=True)

    print("Loading model weights (this may take a few moments)...")
    model = Gemma3ForCausalLM.from_pretrained(
        model_id, quantization_config=quantization_config
    ).eval()

    tokenizer = AutoTokenizer.from_pretrained(model_id)

    messages = [
        [
            {
                "role": "system",
                "content": [{"type": "text", "text": "You are a helpful assistant."},]
            },
            {
                "role": "user",
                "content": [{"type": "text", "text": "Write a poem on Hugging Face, the company"},]
            },
        ],
    ]
    
    print("\nApplying chat template...")
    inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=True,
        return_dict=True,
        return_tensors="pt",
    ).to(model.device).to(torch.bfloat16)

    print("Running inference...")
    with torch.inference_mode():
        outputs = model.generate(**inputs, max_new_tokens=64)

    outputs = tokenizer.batch_decode(outputs)
    
    print("\n=== GENERATED OUTPUT ===")
    print(outputs[0])
    print("========================\n")

if __name__ == "__main__":
    main()
