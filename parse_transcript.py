import json

log_path = r'C:\Users\monse\.gemini\antigravity\brain\11eca75d-c694-497b-9b7c-22616f9426e4\.system_generated\logs\transcript.jsonl'
with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
        except:
            continue
        if 'tool_calls' in data:
            for tc in data['tool_calls']:
                name = tc.get('name')
                if name in ['replace_file_content', 'multi_replace_file_content', 'write_to_file']:
                    try:
                        args = tc.get('arguments', {})
                        if isinstance(args, str):
                            args = json.loads(args)
                        target = args.get('TargetFile', '')
                        if 'app.py' in target or 'proyecto_cotizacion' in target or 'legacy_api.py' in target or 'presentation_pdf.py' in target:
                            print(f"Step {data.get('step_index')}: {name} -> {target}")
                    except:
                        pass
