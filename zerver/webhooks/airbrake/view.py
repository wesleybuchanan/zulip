# Webhooks for external integrations.
from typing import Dict, Any, Text
from django.http import HttpRequest, HttpResponse
from django.utils.translation import ugettext as _
from zerver.lib.actions import check_send_stream_message
from zerver.lib.response import json_success, json_error
from zerver.decorator import REQ, has_request_variables, api_key_only_webhook_view
from zerver.models import UserProfile

AIRBRAKE_SUBJECT_TEMPLATE = '{project_name}'
AIRBRAKE_MESSAGE_TEMPLATE = '[{error_class}]({error_url}): "{error_message}" occurred.'

@api_key_only_webhook_view('Airbrake')
@has_request_variables
def api_airbrake_webhook(request, user_profile,
                         payload=REQ(argument_type='body'),
                         stream=REQ(default='airbrake')):
    # type: (HttpRequest, UserProfile, Dict[str, Any], Text) -> HttpResponse
    subject = get_subject(payload)
    body = get_body(payload)
    check_send_stream_message(user_profile, request.client,
                              stream, subject, body)
    return json_success()

def get_subject(payload):
    # type: (Dict[str, Any]) -> str
    return AIRBRAKE_SUBJECT_TEMPLATE.format(project_name=payload['error']['project']['name'])

def get_body(payload):
    # type: (Dict[str, Any]) -> str
    data = {
        'error_url': payload['airbrake_error_url'],
        'error_class': payload['error']['error_class'],
        'error_message': payload['error']['error_message'],
    }
    return AIRBRAKE_MESSAGE_TEMPLATE.format(**data)
