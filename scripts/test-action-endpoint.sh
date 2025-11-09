#!/bin/bash

# Script para testar o endpoint de execução de actions
# Uso: ./scripts/test-action-endpoint.sh <action-type> [company-id] [user-id]

set -e

API_URL="${API_URL:-http://localhost:3000}"
ACTION_TYPE="${1}"
COMPANY_ID="${2:-123e4567-e89b-12d3-a456-426614174000}"
USER_ID="${3:-123e4567-e89b-12d3-a456-426614174001}"
CONTACT_ID="${4:-123e4567-e89b-12d3-a456-426614174002}"
INSTANCE_NAME="${INSTANCE_NAME:-default-instance}"

if [ -z "$ACTION_TYPE" ]; then
  echo "Uso: $0 <action-type> [company-id] [user-id] [contact-id]"
  echo ""
  echo "Action types disponíveis:"
  echo "  - FINISH_ONBOARDING"
  echo "  - SEND_MESSAGE"
  echo "  - REQUEST_HUMAN_CONTACT"
  echo "  - NOTIFY_USER"
  echo "  - SEARCH_CONVERSATION"
  echo "  - UPDATE_COMPANY"
  echo ""
  echo "Exemplo:"
  echo "  $0 FINISH_ONBOARDING"
  echo "  $0 SEND_MESSAGE abc-123 def-456"
  exit 1
fi

case "$ACTION_TYPE" in
  FINISH_ONBOARDING)
    PAYLOAD='{
      "type": "FINISH_ONBOARDING",
      "payload": {
        "companyName": "Empresa Teste",
        "description": "Empresa de teste para desenvolvimento",
        "businessHours": "Segunda a Sexta, 9h às 18h",
        "phone": "11999999999",
        "email": "contato@teste.com",
        "address": "Rua Teste, 123"
      },
      "context": {
        "companyId": "'"$COMPANY_ID"'",
        "instanceName": "'"$INSTANCE_NAME"'",
        "userId": "'"$USER_ID"'"
      }
    }'
    ;;
    
  SEND_MESSAGE)
    PAYLOAD='{
      "type": "SEND_MESSAGE",
      "payload": {
        "recipientName": "João Silva",
        "recipientPhone": "5511999999999",
        "message": "Olá João, esta é uma mensagem de teste!"
      },
      "context": {
        "companyId": "'"$COMPANY_ID"'",
        "instanceName": "'"$INSTANCE_NAME"'",
        "userId": "'"$USER_ID"'"
      }
    }'
    ;;
    
  REQUEST_HUMAN_CONTACT)
    PAYLOAD='{
      "type": "REQUEST_HUMAN_CONTACT",
      "payload": {
        "reason": "Cliente solicitou falar com atendente - Teste",
        "urgency": "high"
      },
      "context": {
        "companyId": "'"$COMPANY_ID"'",
        "instanceName": "'"$INSTANCE_NAME"'",
        "contactId": "'"$CONTACT_ID"'"
      }
    }'
    ;;
    
  NOTIFY_USER)
    PAYLOAD='{
      "type": "NOTIFY_USER",
      "payload": {
        "message": "Cliente está aguardando resposta - Teste",
        "context": "Conversa sobre orçamento"
      },
      "context": {
        "companyId": "'"$COMPANY_ID"'",
        "instanceName": "'"$INSTANCE_NAME"'",
        "contactId": "'"$CONTACT_ID"'"
      }
    }'
    ;;
    
  SEARCH_CONVERSATION)
    PAYLOAD='{
      "type": "SEARCH_CONVERSATION",
      "payload": {
        "contactName": "Maria Santos",
        "query": "orçamento",
        "days": 7
      },
      "context": {
        "companyId": "'"$COMPANY_ID"'",
        "instanceName": "'"$INSTANCE_NAME"'",
        "userId": "'"$USER_ID"'"
      }
    }'
    ;;
    
  UPDATE_COMPANY)
    PAYLOAD='{
      "type": "UPDATE_COMPANY",
      "payload": {
        "updateRequest": "Alterar horário de atendimento para 8h às 17h"
      },
      "context": {
        "companyId": "'"$COMPANY_ID"'",
        "instanceName": "'"$INSTANCE_NAME"'",
        "userId": "'"$USER_ID"'"
      }
    }'
    ;;
    
  *)
    echo "Erro: Action type '$ACTION_TYPE' não reconhecido"
    exit 1
    ;;
esac

echo "========================================="
echo "Executando action: $ACTION_TYPE"
echo "API URL: $API_URL"
echo "Company ID: $COMPANY_ID"
echo "========================================="
echo ""
echo "Payload:"
echo "$PAYLOAD" | jq '.'
echo ""
echo "Enviando requisição..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/actions/execute" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "========================================="
echo "HTTP Status: $HTTP_CODE"
echo "========================================="
echo ""

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "✅ Sucesso!"
  echo ""
  echo "$BODY" | jq '.'
else
  echo "❌ Erro!"
  echo ""
  echo "$BODY" | jq '.'
  exit 1
fi
