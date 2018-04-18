
from django.http import HttpResponse, HttpRequest
from typing import List, Text

import ujson

from django.utils.translation import ugettext as _
<<<<<<< HEAD
from zerver.decorator import authenticated_json_post_view
from zerver.lib.actions import do_mute_topic, do_unmute_topic, do_change_unmute_time
=======
from zerver.lib.actions import do_mute_topic, do_unmute_topic
>>>>>>> a6a5636a326d41c82a21f5fe2b26463162b37621
from zerver.lib.request import has_request_variables, REQ
from zerver.lib.response import json_success, json_error
from zerver.lib.topic_mutes import topic_is_muted
from zerver.lib.streams import access_stream_by_name, access_stream_for_unmute_topic
from zerver.lib.validator import check_string, check_list
from zerver.models import get_stream, Stream, UserProfile

def mute_topic(user_profile: UserProfile, stream_name: str,
               topic_name: str) -> HttpResponse:
    (stream, recipient, sub) = access_stream_by_name(user_profile, stream_name)

    if topic_is_muted(user_profile, stream.id, topic_name):
        return json_error(_("Topic already muted"))

    do_mute_topic(user_profile, stream, recipient, topic_name)
    return json_success()

def unmute_topic(user_profile: UserProfile, stream_name: str,
                 topic_name: str) -> HttpResponse:
    error = _("Topic is not there in the muted_topics list")
    stream = access_stream_for_unmute_topic(user_profile, stream_name, error)

    if not topic_is_muted(user_profile, stream.id, topic_name):
        return json_error(error)

    do_unmute_topic(user_profile, stream, topic_name)
    return json_success()

@has_request_variables
def update_muted_topic(request: HttpRequest, user_profile: UserProfile, stream: str=REQ(),
                       topic: str=REQ(), op: str=REQ()) -> HttpResponse:

    if op == 'add':
        return mute_topic(user_profile, stream, topic)
    elif op == 'remove':
        return unmute_topic(user_profile, stream, topic)

@has_request_variables
def update_muted_time(request, user_profile, unmuteTime=REQ()):
    # type: (HttpRequest, UserProfile, DateTime) -> HttpResponse
    do_change_unmute_time(user_profile, unmuteTime)
    return json_success()

