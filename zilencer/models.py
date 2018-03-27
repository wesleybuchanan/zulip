from django.db import models
from django.db.models import Manager
from typing import Dict, Optional, Text

import zerver.models
import datetime

def get_remote_server_by_uuid(uuid):
    # type: (Text) -> RemoteZulipServer
    return RemoteZulipServer.objects.get(uuid=uuid)

class RemoteZulipServer(models.Model):
    uuid = models.CharField(max_length=36, unique=True)  # type: Text
    api_key = models.CharField(max_length=64)  # type: Text

    hostname = models.CharField(max_length=128, unique=True)  # type: Text
    contact_email = models.EmailField(blank=True, null=False)  # type: Text
    last_updated = models.DateTimeField('last updated', auto_now=True)  # type: datetime.datetime

# Variant of PushDeviceToken for a remote server.
class RemotePushDeviceToken(zerver.models.AbstractPushDeviceToken):
    server = models.ForeignKey(RemoteZulipServer)  # type: RemoteZulipServer
    # The user id on the remote server for this device device this is
    user_id = models.BigIntegerField(db_index=True)  # type: int
    token = models.CharField(max_length=4096, db_index=True)  # type: bytes

    class Meta(object):
        unique_together = ("server", "token")
