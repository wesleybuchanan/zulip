# -*- coding: utf-8 -*-
# Generated by Django 1.10.5 on 2017-03-31 14:21

from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('zerver', '0070_userhotspot'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='RealmAlias',
            new_name='RealmDomain',
        ),
    ]
