#!/bin/bash
# TRUSTNOW Vault environment bootstrap
# Source this before any command that needs Vault-sourced secrets
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN=$(python3 -c "import json; d=json.load(open('/opt/trustnowailabs/trustnow-ai-worker-stack/vault-init.json')); print(d['root_token'])" 2>/dev/null)
export KUBECONFIG=/home/trustnow/.kube/config
